import React from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2, User, Wrench } from 'lucide-react';
import { SECTIONS } from '../constants';

const PreviousWorkOrders = ({ orders, onClose }) => {
    // Ensure we only show completed orders just in case
    const completedOrders = orders.filter(o => o.status === 'COMPLETED');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-esd-dark/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-esd-dark">Previous Work Orders</h2>
                        <p className="text-sm text-slate-400">History of resolved work orders</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {completedOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-500">No History Found</h3>
                            <p className="text-slate-400 max-w-sm mt-1">
                                You don't have any completed work orders yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {completedOrders.map((order) => (
                                <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

                                        {/* Order Info */}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                    Completed
                                                </span>
                                                <span className="text-xs font-bold text-slate-400">
                                                    {new Date(order.submittedAt?.seconds * 1000).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-lg text-esd-dark">
                                                {order.department || order.quarter}
                                            </h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">
                                                {order.requirement}
                                            </p>
                                            <p className="text-xs font-bold text-slate-400 uppercase mt-2">
                                                {SECTIONS.find(s => s.id === order.section)?.name || order.section} Section
                                            </p>
                                        </div>

                                        {/* Completion Details */}
                                        <div className="w-full md:w-1/3 bg-slate-50 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-primary">
                                                <User size={16} />
                                                <span className="text-xs font-bold uppercase">Technician</span>
                                            </div>
                                            <p className="text-sm font-medium pl-6">
                                                {order.technicianName || 'Not recorded'}
                                            </p>

                                            {order.materials && order.materials.length > 0 && (
                                                <>
                                                    <div className="flex items-center gap-2 text-primary pt-2 border-t border-slate-200/50">
                                                        <Wrench size={16} />
                                                        <span className="text-xs font-bold uppercase">Materials Used</span>
                                                    </div>
                                                    <ul className="pl-6 space-y-1">
                                                        {order.materials.map((m, idx) => (
                                                            <li key={idx} className="text-sm text-slate-600">
                                                                {m.name} <span className="text-slate-400">×{m.quantity} {m.unit}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Completion Date Footer */}
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                                        <span className="text-xs font-medium text-slate-400">
                                            Completed on {order.completedAt ? new Date(order.completedAt.seconds * 1000).toLocaleDateString() : '—'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default PreviousWorkOrders;
