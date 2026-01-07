import React from 'react';
import { motion } from 'framer-motion';
import { X, Clock, CheckCircle2, User, Wrench, Calendar, MapPin, FileText, Image, ArrowRight } from 'lucide-react';
import { SECTIONS } from '../constants';

const WorkOrderDetailModal = ({ order, onClose }) => {
    if (!order) return null;


    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-esd-dark/90 backdrop-blur-md print:p-0 print:bg-white print:backdrop-blur-none">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden print:shadow-none print:max-h-none print:rounded-none"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10 print:hidden">
                    <div>
                        <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Work Order Details</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                    {/* Status Badge */}
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-2">
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                }`}>
                                {order.status === 'COMPLETED' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                {order.status}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                Section: {SECTIONS.find(s => s.id === order.section)?.name || order.section}
                            </span>
                            {order.status === 'FORWARDED' && (
                                <div className="mt-3 flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-2xl text-[10px] font-black text-blue-700 uppercase tracking-wider">
                                    <span>{SECTIONS.find(s => s.id === order.previousSection)?.name || order.previousSection}</span>
                                    <ArrowRight size={14} className="text-blue-400" />
                                    <span>{SECTIONS.find(s => s.id === order.section)?.name || order.section}</span>
                                </div>
                            )}
                        </div>
                        {order.submittedAt && (
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Submitted On</p>
                                <p className="text-xs font-black text-blue-900">
                                    {new Date(order.submittedAt.seconds * 1000).toLocaleString('en-IN', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                    })}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Location Details */}
                        <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                            <div className="flex items-center gap-3 text-primary">
                                <MapPin size={20} />
                                <span className="text-[11px] font-black uppercase tracking-tighter">Location Details</span>
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-blue-900 leading-tight">
                                    {order.department || order.quarter}
                                </h4>
                                <p className="text-sm font-bold text-slate-400 mt-1">
                                    {order.location === 'lab' ? 'LAB (In campus)' : 'Staff Quarters & Out Campus'}
                                </p>
                                {order.location === 'lab' && (
                                    <div className="mt-2 pt-2 border-t border-slate-200/50">
                                        {order.building && (
                                            <p className="text-xs font-bold text-blue-900/70">
                                                Building: <span className="text-blue-900">{order.building}</span>
                                            </p>
                                        )}
                                        {order.roomNo && (
                                            <p className="text-xs font-bold text-blue-900/70">
                                                Room: <span className="text-blue-900">{order.roomNo}</span>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Requester Info */}
                        <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                            <div className="flex items-center gap-3 text-primary">
                                <User size={20} />
                                <span className="text-[11px] font-black uppercase tracking-tighter">Requester Information</span>
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-blue-900 leading-tight">{order.requesterName || 'N/A'}</h4>
                                <p className="text-sm font-bold text-slate-500 mt-1">{order.requesterPhone || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Requirement */}
                    <div className="space-y-4 bg-blue-900/5 p-6 rounded-3xl border border-blue-900/10">
                        <div className="flex items-center gap-3 text-blue-900">
                            <FileText size={20} />
                            <span className="text-[11px] font-black uppercase tracking-tighter">Requirement Details</span>
                        </div>
                        <p className="text-sm font-bold text-blue-900/80 leading-relaxed italic">
                            "{order.requirement}"
                        </p>
                        {order.attachmentUrl && (
                            <div className="mt-4">
                                <a
                                    href={order.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                                >
                                    <Image size={14} /> View Attached Image
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Completion Details */}
                    {order.status === 'COMPLETED' && (
                        <div className="space-y-6 pt-6 border-t border-slate-100">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-3 text-green-600">
                                        <Calendar size={20} />
                                        <span className="text-[11px] font-black uppercase tracking-tighter">Completion Timeline</span>
                                    </div>
                                    <div className="pl-8">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Completed On</p>
                                        <p className="text-sm font-black text-blue-900">
                                            {order.completedAt ? new Date(order.completedAt.seconds * 1000).toLocaleString('en-IN', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short'
                                            }) : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-3 text-green-600">
                                        <Wrench size={20} />
                                        <span className="text-[11px] font-black uppercase tracking-tighter">Resolved By</span>
                                    </div>
                                    <div className="pl-8 text-sm font-black text-blue-900">
                                        {Array.isArray(order.technicians) ? order.technicians.join(', ') : (order.technicianName || 'ESD Staff')}
                                    </div>
                                </div>
                            </div>

                            {/* Materials */}
                            {order.materials && order.materials.length > 0 && (
                                <div className="p-6 bg-green-50 rounded-3xl border border-green-100">
                                    <div className="flex items-center gap-3 text-green-700 mb-4">
                                        <Wrench size={18} />
                                        <span className="text-[11px] font-black uppercase tracking-tighter">Materials Used</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {order.materials.map((m, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-green-200/50">
                                                <span className="text-sm font-bold text-green-800">{m.name}</span>
                                                <span className="text-xs font-black text-green-600 bg-green-100 px-2 py-1 rounded-lg">
                                                    {m.quantity} {m.unit || 'Nos'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Print Footer */}
                <div className="hidden print:block p-8 pt-0 mt-8 border-t border-slate-200">
                    <p className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-[0.2em]">Generated by CSIR-IICT Engineering Services Division Online Portal</p>
                </div>
            </motion.div>
        </div>
    );
};

export default WorkOrderDetailModal;
