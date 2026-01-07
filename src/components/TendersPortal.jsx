import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FileText, Plus, Search, Calendar, Clock, AlertTriangle,
    CheckCircle2, Download, Eye, Trash2, Edit2, ArrowLeft,
    ChevronRight, Lock, Camera, Paperclip, X, Save, FileSpreadsheet, RefreshCw
} from 'lucide-react'
import { TENDERS_SUB_SECTIONS, SECTION_PASSWORDS } from '../constants'
import {
    submitTender, subscribeToTenders, updateTender,
    addDailyStatus, subscribeToDailyStatus, deleteDailyStatus,
    updateDailyStatus, generateTenderCSV
} from '../services/tenderService'
import { storage } from '../firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import freshReset from '../resetData'

const TendersPortal = ({ section, location, isHod, onBack }) => {
    // When section/location are provided, we skip the section selection view
    const initialView = (section && location) ? 'dashboard' : 'sections'
    const [subView, setSubView] = useState(initialView)
    const [selectedSubSection, setSelectedSubSection] = useState(
        (section && location) ? TENDERS_SUB_SECTIONS.find(s => s.baseId === section && s.location === location) : null
    )
    const [pass, setPass] = useState('')
    const [authError, setAuthError] = useState('')

    const [tenders, setTenders] = useState([])
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [selectedTender, setSelectedTender] = useState(null)
    const [dailyStatuses, setDailyStatuses] = useState([])
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [showCompletionModal, setShowCompletionModal] = useState(false)

    // Form states
    const [uploading, setUploading] = useState(false)
    const [tenderForm, setTenderForm] = useState({
        workName: '',
        fileNo: '',
        workOrderDate: '',
        workOrderHandoverDate: '',
        duration: '',
        tenderAmount: '',
        remarks: '',
        attachmentUrl: '',
        involvedSections: []
    })

    const [showShareModal, setShowShareModal] = useState(false)
    const [justSavedTenderId, setJustSavedTenderId] = useState(null)
    const [notices, setNotices] = useState([])

    const [statusForm, setStatusForm] = useState({
        date: new Date().toISOString().split('T')[0],
        workDone: ''
    })
    const [editingStatus, setEditingStatus] = useState(null)

    const [completionForm, setCompletionForm] = useState({
        dateOfMeasurement: '',
        finalBillAmount: '',
        recoveriesAmount: '',
        mbNo: ''
    })

    useEffect(() => {
        if (selectedSubSection && subView === 'dashboard') {
            const unsub = subscribeToTenders(selectedSubSection.id, (data) => {
                setTenders(data)
            })
            const unsubNotices = subscribeToNotices(selectedSubSection.id, (data) => {
                setNotices(data)
            })
            return () => {
                unsub()
                unsubNotices()
            }
        } else if (isHod && subView === 'dashboard') {
            const unsub = subscribeToAllTenders((data) => {
                setTenders(data)
            })
            return () => unsub()
        }
    }, [selectedSubSection, subView, isHod])

    useEffect(() => {
        if (selectedTender) {
            const unsub = subscribeToDailyStatus(selectedTender.id, (data) => {
                setDailyStatuses(data)
            })
            return () => unsub()
        }
    }, [selectedTender])

    const handleSubSectionLogin = () => {
        const expected = SECTION_PASSWORDS[selectedSubSection.baseId];
        if (pass === expected) {
            setSubView('dashboard');
            setAuthError('');
            setPass('');
        } else {
            setAuthError('Invalid password for ' + selectedSubSection.name);
        }
    }

    const calculateDates = (handoverDate, duration) => {
        if (!handoverDate || !duration) return { commencement: '', completion: '' };

        const d1 = new Date(handoverDate);
        // Commencement = WO Handover Date + 10 days (including both dates means +9 days)
        const commencement = new Date(d1);
        commencement.setDate(d1.getDate() + 9);

        // Completion = Commencement + duration (including commencement date means +duration-1)
        const completion = new Date(commencement);
        completion.setDate(commencement.getDate() + parseInt(duration) - 1);

        return {
            commencement: commencement.toISOString().split('T')[0],
            completion: completion.toISOString().split('T')[0]
        };
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const storageRef = ref(storage, `tenders/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setTenderForm(prev => ({ ...prev, attachmentUrl: url }));
        } catch (err) {
            alert("Upload failed: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleTenderSubmit = async (e) => {
        e.preventDefault();
        if (!tenderForm.attachmentUrl) {
            alert("Compulsory: Please upload Work Order attachment before proceeding.");
            return;
        }

        const { commencement, completion } = calculateDates(tenderForm.workOrderHandoverDate, tenderForm.duration);
        try {
            const dataToSave = {
                ...tenderForm,
                section: selectedSubSection.id,
                commencementDate: commencement,
                completionDate: completion,
                status: 'ACTIVE',
                entryDate: new Date().toISOString()
            };

            let tenderId;
            if (selectedTender) {
                // Update existing
                await updateTender(selectedTender.id, dataToSave);
                tenderId = selectedTender.id;
                alert("Tender Updated Successfully!");
            } else {
                // New entry
                tenderId = await submitTender(dataToSave);
                setJustSavedTenderId(tenderId);

                // If involved sections were selected in the form, suggest sharing with them immediately
                // Or we can just auto-share and then show the modal for "ANY OTHER" sections.
                // Let's stick to the current modal flow but pre-check the sections.
                setShowShareModal(true);
            }

            setShowUploadModal(false);
            setSelectedTender(null);
            setTenderForm({
                workName: '',
                fileNo: '',
                workOrderDate: '',
                workOrderHandoverDate: '',
                duration: '',
                tenderAmount: '',
                remarks: '',
                attachmentUrl: '',
                involvedSections: []
            });
        } catch (err) {
            alert("Error: " + err.message);
        }
    }

    const handleStatusSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingStatus) {
                await updateDailyStatus(selectedTender.id, editingStatus.id, statusForm);
                setEditingStatus(null);
            } else {
                await addDailyStatus(selectedTender.id, statusForm);
            }
            setStatusForm({ date: new Date().toISOString().split('T')[0], workDone: '' });
        } catch (err) {
            alert("Error: " + err.message);
        }
    }

    const handleTenderCompletion = async (e) => {
        e.preventDefault();
        try {
            await updateTender(selectedTender.id, {
                ...completionForm,
                status: 'COMPLETED',
                completedAt: serverTimestamp()
            });
            setShowCompletionModal(false);
            setCompletionForm({
                dateOfMeasurement: '',
                finalBillAmount: '',
                recoveriesAmount: '',
                mbNo: ''
            });
            alert("Tender Marked as Completed!");
        } catch (err) {
            alert("Error: " + err.message);
        }
    }

    const getEscalationInfo = (commencement, completion) => {
        const start = new Date(commencement);
        const end = new Date(completion);
        const today = new Date();
        const totalDuration = end - start;
        const elapsed = today - start;
        const percent = (elapsed / totalDuration) * 100;
        const leftDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

        return {
            isAlert: percent >= 85 && leftDays >= 0,
            leftDays: leftDays < 0 ? 0 : leftDays,
            percent: Math.min(100, Math.max(0, percent))
        };
    }

    const downloadCSV = async (tender) => {
        const statuses = await new Promise((resolve) => {
            const unsub = subscribeToDailyStatus(tender.id, (data) => {
                unsub();
                resolve(data);
            });
        });
        const csvContent = await generateTenderCSV(tender, statuses);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Tender_${tender.workOrderNo}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const viewCSV = async (tender) => {
        const statuses = await new Promise((resolve) => {
            const unsub = subscribeToDailyStatus(tender.id, (data) => {
                unsub();
                resolve(data);
            });
        });
        const csvContent = await generateTenderCSV(tender, statuses);
        const win = window.open("", "_blank");
        win.document.write(`<pre>${csvContent}</pre>`);
    }

    const handleShare = async (selectedSections) => {
        try {
            await shareTender(justSavedTenderId, selectedSections, selectedSubSection.name);
            setShowShareModal(false);
            setJustSavedTenderId(null);
            alert("Tender shared successfully!");
        } catch (err) {
            alert("Error sharing: " + err.message);
        }
    }

    return (
        <div className="min-h-[600px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (subView === 'sections') onBack();
                            else if (subView === 'login') setSubView('sections');
                            else setSubView('sections');
                        }}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-esd-dark">Tenders(W&S)</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {subView === 'dashboard' ? selectedSubSection.name : 'Sub-Section Selection'}
                        </p>
                    </div>
                </div>
                {subView === 'dashboard' && (
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                if (window.confirm("CRITICAL: This will permanently delete ALL data (Work Orders, Tenders, Daily status) to make the app fresh. Proceed?")) {
                                    await freshReset();
                                }
                            }}
                            className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all flex items-center gap-2 font-bold text-xs"
                            title="Reset Application Data"
                        >
                            <RefreshCw size={18} />
                            Reset
                        </button>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="btn-primary flex items-center gap-2 px-6 py-3"
                        >
                            <Plus size={18} />
                            Upload Tender Details
                        </button>
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                {subView === 'sections' && (
                    <motion.div
                        key="sections"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                        {TENDERS_SUB_SECTIONS.map(s => (
                            <div
                                key={s.id}
                                onClick={() => {
                                    setSelectedSubSection(s);
                                    setSubView('login');
                                }}
                                className="glass-card p-6 rounded-3xl cursor-pointer hover:bg-primary/5 border border-slate-100 flex flex-col items-center justify-center gap-4 transition-all group"
                            >
                                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                    <FileText size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-esd-dark">{s.name}</h3>
                                <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                            </div>
                        ))}
                    </motion.div>
                )}

                {subView === 'login' && (
                    <motion.div
                        key="login"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="max-w-md mx-auto py-12"
                    >
                        <div className="glass-card p-8 rounded-3xl text-center space-y-6">
                            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Lock size={32} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-esd-dark">Section Login</h2>
                                <p className="text-slate-400 text-sm mt-1">Enter password for {selectedSubSection.name} section</p>
                            </div>
                            <input
                                type="password"
                                placeholder="Enter Password"
                                className="input-field text-center text-lg tracking-widest"
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSubSectionLogin()}
                            />
                            {authError && <p className="text-red-500 text-xs font-bold">{authError}</p>}
                            <button onClick={handleSubSectionLogin} className="w-full btn-primary py-4 text-lg">Login</button>
                        </div>
                    </motion.div>
                )}

                {subView === 'dashboard' && (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        {/* Notices Marquee */}
                        {notices.length > 0 && (
                            <div className="bg-amber-50 border-y border-amber-100 overflow-hidden relative py-2">
                                <div className="flex animate-marquee whitespace-nowrap gap-8">
                                    {notices.map(notice => (
                                        <div key={notice.id} className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                                            <AlertTriangle size={14} className="animate-pulse" />
                                            New work order(Tenders(W&S) is shared by {notice.sourceSectionName}
                                            <button
                                                onClick={() => clearNotice(notice.id)}
                                                className="ml-2 underline text-[10px] hover:text-amber-900"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {tenders.length === 0 ? (
                            <div className="text-center py-24 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                                <FileText size={64} className="mx-auto text-slate-200 mb-6" />
                                <h3 className="text-xl font-bold text-slate-400">No Tenders Found</h3>
                                <p className="text-slate-400 mt-2">Start by uploading tender details for this section.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {tenders.map((tender, index) => {
                                    const esc = getEscalationInfo(tender.commencementDate, tender.completionDate);
                                    const isShared = tender.section !== selectedSubSection?.id;
                                    return (
                                        <div
                                            key={tender.id}
                                            className={`glass-card rounded-[32px] overflow-hidden border-2 transition-all ${esc.isAlert && tender.status === 'ACTIVE' ? 'border-red-100 bg-red-50/20' : 'border-slate-100 hover:border-primary/20'}`}
                                        >
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">SL NO: {index + 1}</span>
                                                        <h3 className="text-lg font-black text-esd-dark leading-tight mt-1">{tender.workName}</h3>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1">{tender.fileNo}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${tender.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                            {tender.status}
                                                        </div>
                                                        {isShared && (
                                                            <div className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-[8px] font-black uppercase">Shared</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-3 mb-6">
                                                    <div className="flex items-center gap-3 text-slate-500">
                                                        <Calendar size={14} />
                                                        <span className="text-xs font-bold">{tender.commencementDate} <span className="text-slate-300 mx-1">→</span> {tender.completionDate}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-primary">
                                                        <FileText size={14} />
                                                        <span className="text-xs font-black">₹ {tender.tenderAmount}</span>
                                                    </div>
                                                </div>

                                                {tender.status === 'ACTIVE' && (
                                                    <div className="mb-6">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Time</span>
                                                            <span className={`text-[10px] font-black uppercase ${esc.isAlert ? 'text-red-500' : 'text-primary'}`}>
                                                                {esc.isAlert ? 'ATTENTION' : `${esc.leftDays} DAYS LEFT`}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${esc.percent}%` }}
                                                                className={`h-full rounded-full ${esc.isAlert ? 'bg-red-500' : 'bg-primary'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setSelectedTender(tender)}
                                                        className="flex-1 bg-esd-dark text-white text-xs font-bold py-3 rounded-2xl hover:bg-black transition-colors"
                                                    >
                                                        Daily Status
                                                    </button>
                                                    {tender.status === 'ACTIVE' ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setTenderForm({
                                                                        workName: tender.workName,
                                                                        fileNo: tender.fileNo,
                                                                        workOrderDate: tender.workOrderDate,
                                                                        workOrderHandoverDate: tender.workOrderHandoverDate,
                                                                        duration: tender.duration,
                                                                        tenderAmount: tender.tenderAmount,
                                                                        remarks: tender.remarks || '',
                                                                        attachmentUrl: tender.attachmentUrl || '',
                                                                        involvedSections: tender.involvedSections || []
                                                                    });
                                                                    setSelectedTender(tender);
                                                                    setShowUploadModal(true);
                                                                }}
                                                                className="px-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-colors"
                                                                title="Edit Tender"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedTender(tender);
                                                                    setShowCompletionModal(true);
                                                                }}
                                                                className="px-4 bg-primary text-white rounded-2xl hover:bg-primary-dark transition-colors"
                                                                title="Mark as Completed"
                                                            >
                                                                <CheckCircle2 size={18} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => downloadCSV(tender)}
                                                                className="w-10 h-10 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-colors"
                                                                title="Download CSV"
                                                            >
                                                                <Download size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => viewCSV(tender)}
                                                                className="w-10 h-10 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-colors"
                                                                title="View CSV"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                                <div>
                                    <h3 className="text-2xl font-black text-esd-dark">Upload Tender Details</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Fill all required fields</p>
                                </div>
                                <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleTenderSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name of the work</label>
                                        <input required className="input-field" value={tenderForm.workName} onChange={e => setTenderForm({ ...tenderForm, workName: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">File no</label>
                                        <input required className="input-field" value={tenderForm.fileNo} onChange={e => setTenderForm({ ...tenderForm, fileNo: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Order Date</label>
                                        <input required type="date" className="input-field" value={tenderForm.workOrderDate} onChange={e => setTenderForm({ ...tenderForm, workOrderDate: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Order Handover Date</label>
                                        <input required type="date" className="input-field" value={tenderForm.workOrderHandoverDate} onChange={e => setTenderForm({ ...tenderForm, workOrderHandoverDate: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration of Work (Days)</label>
                                        <input required type="number" className="input-field" value={tenderForm.duration} onChange={e => setTenderForm({ ...tenderForm, duration: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tender Amount (₹)</label>
                                        <input required type="number" className="input-field" value={tenderForm.tenderAmount} onChange={e => setTenderForm({ ...tenderForm, tenderAmount: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sections Involved in this Tender</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                                            {TENDERS_SUB_SECTIONS.filter(s => s.id !== selectedSubSection?.id).map(s => (
                                                <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                        checked={tenderForm.involvedSections.includes(s.id)}
                                                        onChange={(e) => {
                                                            const newSections = e.target.checked
                                                                ? [...tenderForm.involvedSections, s.id]
                                                                : tenderForm.involvedSections.filter(id => id !== s.id);
                                                            setTenderForm({ ...tenderForm, involvedSections: newSections });
                                                        }}
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-esd-dark truncate">{s.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {tenderForm.workOrderHandoverDate && tenderForm.duration && (
                                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col md:flex-row gap-6">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Commencement Date</p>
                                            <p className="text-lg font-bold text-esd-dark">{calculateDates(tenderForm.workOrderHandoverDate, tenderForm.duration).commencement}</p>
                                            <p className="text-[9px] text-slate-400 font-bold">(W.O Handover Date + 10 Days)</p>
                                        </div>
                                        <div className="flex-2">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Completion Date</p>
                                            <p className="text-lg font-bold text-esd-dark">{calculateDates(tenderForm.workOrderHandoverDate, tenderForm.duration).completion}</p>
                                            <p className="text-[9px] text-slate-400 font-bold">(Commencement + Duration)</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks (Optional)</label>
                                    <textarea className="input-field min-h-[100px]" value={tenderForm.remarks} onChange={e => setTenderForm({ ...tenderForm, remarks: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Order Attachment (Compulsory)</label>
                                    <div className="relative h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:bg-slate-100 transition-colors group">
                                        {uploading ? (
                                            <div className="animate-spin text-primary"><Clock size={32} /></div>
                                        ) : tenderForm.attachmentUrl ? (
                                            <div className="flex flex-col items-center gap-2 text-green-600">
                                                <CheckCircle2 size={32} />
                                                <span className="text-[10px] font-bold">ATTACHED</span>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setTenderForm({ ...tenderForm, attachmentUrl: '' }); }} className="text-xs text-red-500 underline">Remove</button>
                                            </div>
                                        ) : (
                                            <>
                                                <Camera size={24} className="text-slate-300 group-hover:text-primary transition-colors" />
                                                <span className="text-[10px] font-bold text-slate-400 mt-2">CLICK TO UPLOAD WORK ORDER</span>
                                            </>
                                        )}
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                                    </div>
                                </div>

                                <button type="submit" disabled={uploading} className="w-full btn-primary py-5 text-lg flex items-center justify-center gap-3">
                                    <Save size={24} />
                                    Complete Entry
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Daily Status Modal */}
            <AnimatePresence>
                {selectedTender && !showCompletionModal && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="bg-white w-full max-w-lg h-full ml-auto shadow-2xl flex flex-col"
                        >
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-esd-dark">{selectedTender.workOrderNo}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Daily Work Status Log</p>
                                </div>
                                <button onClick={() => setSelectedTender(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                {/* Status Entry Form */}
                                <form onSubmit={handleStatusSubmit} className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Calendar size={16} className="text-primary" />
                                        <h4 className="text-xs font-black text-esd-dark uppercase tracking-widest">{editingStatus ? 'Edit Status' : 'Add Daily Entry'}</h4>
                                    </div>
                                    <input type="date" required className="input-field" value={statusForm.date} onChange={e => setStatusForm({ ...statusForm, date: e.target.value })} />
                                    <textarea required placeholder="Describe work done today..." className="input-field min-h-[80px]" value={statusForm.workDone} onChange={e => setStatusForm({ ...statusForm, workDone: e.target.value })} />
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 btn-primary py-3 text-xs uppercase tracking-widest font-black">
                                            {editingStatus ? 'Update Entry' : 'Add to Log'}
                                        </button>
                                        {editingStatus && (
                                            <button onClick={() => {
                                                setEditingStatus(null);
                                                setStatusForm({ date: new Date().toISOString().split('T')[0], workDone: '' });
                                            }} className="px-4 bg-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase">Cancel</button>
                                        )}
                                    </div>
                                </form>

                                {/* List */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Status History</h4>
                                    {dailyStatuses.map(status => (
                                        <div key={status.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-primary/20 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{status.date}</span>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => {
                                                        setEditingStatus(status);
                                                        setStatusForm({ date: status.date, workDone: status.workDone });
                                                    }} className="text-slate-400 hover:text-blue-500"><Edit2 size={12} /></button>
                                                    <button onClick={() => {
                                                        if (window.confirm("Delete this entry?")) deleteDailyStatus(selectedTender.id, status.id);
                                                    }} className="text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed font-bold italic">"{status.workDone}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Completion Modal */}
            <AnimatePresence>
                {showCompletionModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden p-10 text-center"
                        >
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-esd-dark mb-2">Tender Completion</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Enter Final Metrics</p>

                            <form onSubmit={handleTenderCompletion} className="space-y-5 text-left">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">6. Date of Measurement</label>
                                    <input type="date" required className="input-field" value={completionForm.dateOfMeasurement} onChange={e => setCompletionForm({ ...completionForm, dateOfMeasurement: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">8. Final bill Amount (₹)</label>
                                    <input type="number" required className="input-field" value={completionForm.finalBillAmount} onChange={e => setCompletionForm({ ...completionForm, finalBillAmount: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">9. Recoveries amount (₹)</label>
                                    <input type="number" required className="input-field" value={completionForm.recoveriesAmount} onChange={e => setCompletionForm({ ...completionForm, recoveriesAmount: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">10. M.B No</label>
                                    <input required className="input-field" value={completionForm.mbNo} onChange={e => setCompletionForm({ ...completionForm, mbNo: e.target.value })} />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCompletionModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase tracking-widest">Cancel</button>
                                    <button type="submit" className="flex-[2] btn-primary py-4 rounded-3xl flex items-center justify-center gap-3">
                                        <Save size={20} />
                                        Complete Tender
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Share Modal */}
            <AnimatePresence>
                {showShareModal && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden p-10"
                        >
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center mx-auto mb-6">
                                    <RefreshCw size={40} className="animate-spin-slow" />
                                </div>
                                <h3 className="text-2xl font-black text-esd-dark mb-2">Share Tender Info</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Do you want to share this information to other section?</p>
                            </div>

                            <div className="space-y-6">
                                <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                    {/* Group sections by type */}
                                    {['lab', 'quarter'].map(type => (
                                        <div key={type} className="space-y-2">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-2 rounded-lg">
                                                {type === 'lab' ? 'Lab Sections' : 'Staff Quarters & Outside Campus'}
                                            </h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {TENDERS_SUB_SECTIONS.filter(s => s.location === type && s.id !== selectedSubSection?.id).map(s => {
                                                    const isPreSelected = tenderForm.involvedSections.includes(s.id);
                                                    return (
                                                        <label key={s.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:bg-primary/5 transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                                id={`share-${s.id}`}
                                                                defaultChecked={isPreSelected}
                                                            />
                                                            <span className="text-xs font-bold text-slate-700">{s.name}</span>
                                                            {isPreSelected && <span className="ml-auto text-[8px] font-black text-primary uppercase">Involved</span>}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => {
                                            setShowShareModal(false);
                                            setJustSavedTenderId(null);
                                        }}
                                        className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase tracking-widest"
                                    >
                                        No
                                    </button>
                                    <button
                                        onClick={() => {
                                            const selected = Array.from(document.querySelectorAll('[id^="share-"]:checked')).map(el => el.id.replace('share-', ''));
                                            if (selected.length === 0) {
                                                alert("Please select at least one section to share.");
                                                return;
                                            }
                                            handleShare(selected);
                                        }}
                                        className="flex-[2] btn-primary py-4 rounded-3xl flex items-center justify-center gap-3"
                                    >
                                        <Save size={20} />
                                        Yes, Share Now
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default TendersPortal
