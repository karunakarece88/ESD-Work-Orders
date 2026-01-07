import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import SummarizedView from './SummarizedView';

const InspectionView = () => {
    const [inspectionOrders, setInspectionOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInspectionOrders = async () => {
            try {
                // Fetch ALL pending/forwarded orders
                // Note: In a large app, this might be expensive. Ideally, we'd have a specific index or 'needsInspection' flag.
                // For this scale, client-side filtering of all active orders is acceptable.
                const q = query(
                    collection(db, "workOrders"),
                    where("status", "in", ["PENDING", "FORWARDED"]),
                    orderBy("submittedAt", "desc")
                );

                const snapshot = await getDocs(q);
                const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);

                const flagged = orders.filter(order => {
                    const submittedTime = order.submittedAt?.seconds * 1000 || Date.now();
                    const isOld = submittedTime < threeDaysAgo;
                    const isExcessivelyForwarded = Number(order.forwardCount || 0) >= 3;

                    return isOld || isExcessivelyForwarded;
                });

                setInspectionOrders(flagged);
            } catch (err) {
                console.error("Error fetching inspection orders:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInspectionOrders();
    }, []);

    if (loading) {
        return <div className="p-10 text-center text-slate-400">Loading Inspection Items...</div>;
    }

    /*
     * We need to wrap these in a way that SummarizedView accepts.
     * SummarizedView expects 'orders'.
     */

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-esd-dark">Inspection Required</h2>
                    <p className="text-slate-400 text-sm">
                        Showing {inspectionOrders.length} orders pending for 3+ days or forwarded excessively
                    </p>
                </div>
            </div>

            {inspectionOrders.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-600">All Good!</h3>
                    <p className="text-slate-400">No active orders require inspection.</p>
                </div>
            ) : (
                <SummarizedView items={inspectionOrders} type="INSPECTION" />
            )}
        </motion.div>
    );
};

export default InspectionView;
