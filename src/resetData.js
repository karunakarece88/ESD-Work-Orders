import { db } from './firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const wipeCollection = async (collectionPath) => {
    console.log(`Cleaning ${collectionPath}...`);
    const q = collection(db, collectionPath);
    const snapshot = await getDocs(q);

    for (const d of snapshot.docs) {
        // If it's a tender, we need to clean sub-collections too
        if (collectionPath === 'tenders') {
            const subQ = collection(db, `tenders/${d.id}/dailyStatus`);
            const subSnap = await getDocs(subQ);
            for (const sd of subSnap.docs) {
                await deleteDoc(doc(db, `tenders/${d.id}/dailyStatus`, sd.id));
            }
        }
        await deleteDoc(doc(db, collectionPath, d.id));
    }
    console.log(`Done cleaning ${collectionPath}.`);
};

const freshReset = async () => {
    try {
        await wipeCollection('workOrders');
        await wipeCollection('tenders');
        await wipeCollection('indents'); // if exists
        await wipeCollection('gatePasses'); // if exists
        alert("All test data has been cleared. The application is now ready for fresh use!");
    } catch (e) {
        console.error("Wipe failed:", e);
        alert("Reset failed. Check console.");
    }
};

export default freshReset;
