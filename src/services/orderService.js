import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, increment } from 'firebase/firestore';

/**
 * Submits a work order to Firestore.
 * Includes a timeout to prevent UI hangs with placeholder credentials.
 */
export const submitWorkOrder = async (orderData) => {
    // Check if configuration is likely a placeholder
    const isPlaceholder = db.app.options.apiKey === "AIzaSyDummyKey_ReplaceWithActual";

    // Create a promise that rejects after 5 seconds
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timed out. Please check your Firebase configuration.")), 5000)
    );

    const submissionPromise = (async () => {
        try {
            const docRef = await addDoc(collection(db, "workOrders"), {
                ...orderData,
                status: 'PENDING',
                requesterEmail: orderData.requesterEmail || '',
                requesterPhone: orderData.requesterPhone || '',
                requesterName: orderData.requesterName || '',
                attachmentUrl: orderData.attachmentUrl || '',
                submittedAt: serverTimestamp(),
            });
            return docRef.id;
        } catch (e) {
            throw e;
        }
    })();

    // Race the submission against the timeout if it's not a local-only test
    // For production, we'd want the full write, but for UX with placeholders, we timeout.
    return Promise.race([submissionPromise, timeoutPromise]);
};

export const subscribeToOrders = (section, callback) => {
    const q = query(
        collection(db, "workOrders"),
        where("section", "==", section)
    );
    return onSnapshot(q, (querySnapshot) => {
        const orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        // Sort manually by submittedAt desc
        orders.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
        callback(orders);
    });
};

export const subscribeToOrdersByRequester = (identifier, callback) => {
    const isEmail = identifier && identifier.includes('@');
    const q = query(
        collection(db, "workOrders"),
        where(isEmail ? "requesterEmail" : "requesterPhone", "==", identifier)
    );
    return onSnapshot(q, (querySnapshot) => {
        const orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        // Sort manually by submittedAt desc
        orders.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
        callback(orders);
    });
};

export const completeWorkOrder = async (orderId, completionData) => {
    try {
        const docRef = doc(db, "workOrders", orderId);
        await updateDoc(docRef, {
            ...completionData,
            status: 'COMPLETED',
            completedAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("Error completing order: ", e);
        throw e;
    }
};

export const forwardWorkOrder = async (orderId, targetSection, previousSection, usedMaterials = []) => {
    try {
        const docRef = doc(db, "workOrders", orderId);
        await updateDoc(docRef, {
            section: targetSection,
            previousSection: previousSection, // Track where it came from
            status: 'FORWARDED',
            forwardedAt: serverTimestamp(),
            materials: usedMaterials, // Save materials used before forwarding
            forwardCount: increment(1) // Increment forward count
        });
    } catch (e) {
        console.error("Error forwarding order: ", e);
        throw e;
    }
};

export const subscribeToForwardedFrom = (section, callback) => {
    const q = query(
        collection(db, "workOrders"),
        where("previousSection", "==", section)
    );
    return onSnapshot(q, (querySnapshot) => {
        const orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        // Sort manually by forwardedAt desc
        orders.sort((a, b) => (b.forwardedAt?.seconds || 0) - (a.forwardedAt?.seconds || 0));
        callback(orders);
    });
};


export const createGatePass = async (gpData) => {
    try {
        const docRef = await addDoc(collection(db, "gatePasses"), {
            ...gpData,
            createdAt: serverTimestamp(),
        });
        // Link logic for reducing indent qty would go here in a transaction
        return docRef.id;
    } catch (e) {
        console.error("Error creating gate pass: ", e);
        throw e;
    }
};
export const archiveWorkOrder = async (orderId) => {
    try {
        const docRef = doc(db, "workOrders", orderId);
        await updateDoc(docRef, {
            status: 'ARCHIVED',
            archivedAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("Error archiving order: ", e);
        throw e;
    }
};

export const deleteWorkOrderForever = async (orderId) => {
    try {
        await deleteDoc(doc(db, "workOrders", orderId));
    } catch (e) {
        console.error("Error deleting order: ", e);
        throw e;
    }
};

export const restoreWorkOrder = async (orderId) => {
    try {
        const docRef = doc(db, "workOrders", orderId);
        await updateDoc(docRef, {
            status: 'PENDING',
            restoredAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("Error restoring order: ", e);
        throw e;
    }
};

/**
 * Searches for work orders by phone, department, or quarter using prefix matching.
 */
export const searchWorkOrders = (searchText, callback) => {
    if (!searchText) {
        callback([]);
        return;
    }

    const coll = collection(db, "workOrders");
    const term = searchText.trim();
    const endTerm = term + '\uf8ff';

    // Helper to get results from a single prefix query
    const getQueryResults = (field) => {
        const q = query(
            coll,
            where(field, ">=", term),
            where(field, "<=", endTerm)
        );
        return onSnapshot(q, (snapshot) => {
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
    };

    // Since we need to search multiple fields and Firestore doesn't support 
    // multiple-prefix-field-queries well in a single call, 
    // we'll run snapshots for each and merge them in the callback.
    let phoneResults = [];
    let deptResults = [];
    let quarterResults = [];
    let buildingResults = [];

    const updateResults = () => {
        const merged = [...phoneResults, ...deptResults, ...quarterResults, ...buildingResults];
        const unique = merged.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
        unique.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
        callback(unique);
    };

    const unsubPhone = onSnapshot(query(coll, where("requesterPhone", ">=", term), where("requesterPhone", "<=", endTerm)), (snap) => {
        phoneResults = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateResults();
    });

    const unsubDept = onSnapshot(query(coll, where("department", ">=", term), where("department", "<=", endTerm)), (snap) => {
        deptResults = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateResults();
    });

    const unsubQuarter = onSnapshot(query(coll, where("quarter", ">=", term), where("quarter", "<=", endTerm)), (snap) => {
        quarterResults = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateResults();
    });

    const unsubBuilding = onSnapshot(query(coll, where("building", ">=", term), where("building", "<=", endTerm)), (snap) => {
        buildingResults = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateResults();
    });

    return () => {
        unsubPhone();
        unsubDept();
        unsubQuarter();
        unsubBuilding();
    };
};
