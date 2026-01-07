import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';

export const submitTender = async (tenderData) => {
    try {
        const docRef = await addDoc(collection(db, "tenders"), {
            ...tenderData,
            status: 'ACTIVE',
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (e) {
        console.error("Error submitting tender: ", e);
        throw e;
    }
};

export const subscribeToTenders = (sectionId, callback) => {
    // sectionId here is one of the IDs in TENDERS_SUB_SECTIONS e.g., t_civil_lab
    const q = query(
        collection(db, "tenders"),
        orderBy("entryDate", "desc")
    );
    return onSnapshot(q, (snapshot) => {
        const tenders = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(t => t.section === sectionId || (t.sharedWith && t.sharedWith.includes(sectionId)));
        callback(tenders);
    });
};

export const subscribeToAllTenders = (callback) => {
    const q = query(collection(db, "tenders"), orderBy("entryDate", "desc"));
    return onSnapshot(q, (snapshot) => {
        const tenders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(tenders);
    });
};

export const updateTender = async (tenderId, updateData) => {
    try {
        const docRef = doc(db, "tenders", tenderId);
        await updateDoc(docRef, {
            ...updateData,
            updatedAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("Error updating tender: ", e);
        throw e;
    }
};

export const deleteTender = async (tenderId) => {
    try {
        await deleteDoc(doc(db, "tenders", tenderId));
    } catch (e) {
        console.error("Error deleting tender: ", e);
        throw e;
    }
};

export const shareTender = async (tenderId, sectionIds, sourceSectionName) => {
    try {
        const tenderRef = doc(db, "tenders", tenderId);
        await updateDoc(tenderRef, {
            sharedWith: sectionIds
        });

        // Create notices for each receiver
        for (const sectionId of sectionIds) {
            await addDoc(collection(db, "tender_notices"), {
                tenderId,
                receiverSection: sectionId,
                sourceSectionName,
                createdAt: serverTimestamp(),
                read: false
            });
        }
    } catch (e) {
        console.error("Error sharing tender: ", e);
        throw e;
    }
};

export const subscribeToNotices = (sectionId, callback) => {
    const q = query(
        collection(db, "tender_notices"),
        where("receiverSection", "==", sectionId),
        where("read", "==", false)
    );
    return onSnapshot(q, (snapshot) => {
        const notices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(notices);
    });
};

export const clearNotice = async (noticeId) => {
    try {
        const docRef = doc(db, "tender_notices", noticeId);
        await updateDoc(docRef, { read: true });
    } catch (e) {
        console.error("Error clearing notice: ", e);
    }
};

export const addDailyStatus = async (tenderId, statusData) => {
    try {
        const docRef = await addDoc(collection(db, `tenders/${tenderId}/dailyStatus`), {
            ...statusData,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding daily status: ", e);
        throw e;
    }
};

export const subscribeToDailyStatus = (tenderId, callback) => {
    const q = query(
        collection(db, `tenders/${tenderId}/dailyStatus`),
        orderBy("date", "desc")
    );
    return onSnapshot(q, (snapshot) => {
        const statuses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(statuses);
    });
};

export const updateDailyStatus = async (tenderId, statusId, updateData) => {
    try {
        const docRef = doc(db, `tenders/${tenderId}/dailyStatus`, statusId);
        await updateDoc(docRef, updateData);
    } catch (e) {
        console.error("Error updating daily status: ", e);
        throw e;
    }
};

export const deleteDailyStatus = async (tenderId, statusId) => {
    try {
        await deleteDoc(doc(db, `tenders/${tenderId}/dailyStatus`, statusId));
    } catch (e) {
        console.error("Error deleting daily status: ", e);
        throw e;
    }
};

export const generateTenderCSV = async (tender, dailyStatuses) => {
    const header = [
        "Name of the work",
        "File No",
        "Tender Amount",
        "Duration (Days)",
        "Work Order Date",
        "Work Order Handover Date",
        "Commencement Date",
        "Completion Date",
        "Measurement Date",
        "Final Bill",
        "Recoveries",
        "MB No",
        "Remarks",
        "Sections Involved"
    ];

    const row = [
        tender.workName,
        tender.fileNo,
        tender.tenderAmount,
        tender.duration,
        tender.workOrderDate,
        tender.workOrderHandoverDate,
        tender.commencementDate,
        tender.completionDate,
        tender.dateOfMeasurement || '',
        tender.finalBillAmount || '',
        tender.recoveriesAmount || '',
        tender.mbNo || '',
        tender.remarks || '',
        tender.involvedSections?.join('; ') || ''
    ];

    const statusHeader = ["\nDaily Status Report"];
    const statusSubHeader = ["Date", "Work Done"];
    const statusRows = dailyStatuses.map(s => [s.date, s.workDone]);

    let csvContent = header.join(",") + "\n" + row.join(",") + "\n" + statusHeader.join(",") + "\n" + statusSubHeader.join(",") + "\n";
    statusRows.forEach(r => {
        csvContent += r.join(",") + "\n";
    });

    return csvContent;
};
