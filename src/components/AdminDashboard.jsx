import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Folder, ChevronRight, Clock, CheckCircle, FileText, Package, Search,
    Camera, X, Lock, Construction, Zap, Wind, Wrench, Hammer, Microscope, AlertTriangle
} from 'lucide-react'
import InventoryView from './InventoryView'
import SummarizedView from './SummarizedView'
import { subscribeToOrders, completeWorkOrder, submitWorkOrder, forwardWorkOrder, subscribeToForwardedFrom, deleteWorkOrderForever } from '../services/orderService'
import { subscribeToAllTenders } from '../services/tenderService'
import CompletionModal from './CompletionModal'
import InspectionView from './InspectionView';
import ForwardingModal from './ForwardingModal'
import ElectricalSpecifics from './ElectricalSpecifics'
import WorkOrderDetailModal from './WorkOrderDetailModal'
import TendersPortal from './TendersPortal'
import { storage } from '../firebase'
import { SECTIONS, SECTION_PASSWORDS } from '../constants'

const AdminDashboard = ({ hideCreation = false, isHodAuthenticated = false }) => {
    const [selectedSection, setSelectedSection] = useState(null)
    const [selectedLocation, setSelectedLocation] = useState(null) // Changed from locationFilter
    const [view, setView] = useState('sections') // sections, dashboard, tenders
    const [activeTab, setActiveTab] = useState('PENDING')
    const [orders, setOrders] = useState([])
    const [forwardedOutOrders, setForwardedOutOrders] = useState([]) // Orders forwarded FROM this section
    const [counts, setCounts] = useState({})
    const [completionOrder, setCompletionOrder] = useState(null)
    const [forwardingOrder, setForwardingOrder] = useState(null)
    const [forwardingTarget, setForwardingTarget] = useState(null)
    const [selectedImage, setSelectedImage] = useState(null)
    const [isSectionAuthenticated, setIsSectionAuthenticated] = useState(false)
    const [sectionPass, setSectionPass] = useState('')
    const [sectionAuthError, setSectionAuthError] = useState('')
    const [allSectionsOrders, setAllSectionsOrders] = useState([])
    const [showAttentionOnly, setShowAttentionOnly] = useState(false)
    const [attentionTendersCount, setAttentionTendersCount] = useState(0)

    useEffect(() => {
        if (isHodAuthenticated) {
            setIsSectionAuthenticated(true);
        }
    }, [isHodAuthenticated]);
    const [showAreaSelection, setShowAreaSelection] = useState(false)
    const [showActionSelection, setShowActionSelection] = useState(false)
    const [selectedOrderDetail, setSelectedOrderDetail] = useState(null)

    useEffect(() => {
        const unsubscribes = SECTIONS.map(section =>
            subscribeToOrders(section.id, (data) => {
                const activeOrders = data.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED');
                setCounts(prev => ({
                    ...prev,
                    [section.id]: {
                        total: activeOrders.length,
                        lab: activeOrders.filter(o => o.location === 'lab').length,
                        quarter: activeOrders.filter(o => o.location !== 'lab').length
                    }
                }))

                if (isHodAuthenticated) {
                    setAllSectionsOrders(prev => {
                        const otherSections = prev.filter(o => o.sectionId !== section.id);
                        const sectionOrders = data.map(o => ({ ...o, sectionId: section.id }));
                        return [...otherSections, ...sectionOrders];
                    });
                }
            })
        )
        // Add a global sub-section for Tenders(W&S) for HOD? No, just a button.
        return () => unsubscribes.forEach(u => u())
    }, [isHodAuthenticated])

    useEffect(() => {
        if (isHodAuthenticated) {
            const unsubscribe = subscribeToAllTenders((data) => {
                const count = data.filter(t => {
                    if (t.status !== 'ACTIVE') return false;
                    const start = new Date(t.commencementDate);
                    const end = new Date(t.completionDate);
                    const today = new Date();
                    const total = end - start;
                    const elapsed = today - start;
                    const percent = (elapsed / total) * 100;
                    return percent >= 85;
                }).length;
                setAttentionTendersCount(count);
            });
            return () => unsubscribe();
        }
    }, [isHodAuthenticated]);

    useEffect(() => {
        if (selectedSection) {
            const unsubscribeOrders = subscribeToOrders(selectedSection, (data) => {
                setOrders(data)
            })
            // Fetch orders forwarded *from* here to elsewhere
            const unsubscribeForwarded = subscribeToForwardedFrom(selectedSection, (data) => {
                setForwardedOutOrders(data)
            })
            return () => {
                unsubscribeOrders();
                unsubscribeForwarded(); // Assuming you export this from orderService, check import
            }
        }
    }, [selectedSection])

    // Filter orders based on location toggle
    const currentSection = SECTIONS.find(s => s.id === selectedSection);
    const isLabOnly = currentSection?.labOnly;

    // Force lab filter if section is lab-only
    useEffect(() => {
        if (isLabOnly) setSelectedLocation('lab'); // Changed from setLocationFilter
    }, [isLabOnly]);

    const filteredOrders = orders.filter(o =>
        selectedLocation === 'lab' ? o.location === 'lab' : o.location !== 'lab' // Changed from locationFilter
    );

    const filteredForwardedOut = forwardedOutOrders.filter(o =>
        selectedLocation === 'lab' ? o.location === 'lab' : o.location !== 'lab' // Changed from locationFilter
    );

    const handleSectionLogin = () => {
        const expected = SECTION_PASSWORDS[selectedSection];

        if (sectionPass === expected) {
            setIsSectionAuthenticated(true);
            setSectionAuthError('');
            setSectionPass('');

            // For Civil/Electrical, we are already past Area Selection
            // For others, we might need to show it now
            if (selectedSection === 'civil' || selectedSection === 'electrical') {
                setShowActionSelection(true);
            } else {
                if (!isLabOnly) {
                    setShowAreaSelection(true);
                } else {
                    setShowActionSelection(true);
                }
            }
        } else {
            setSectionAuthError('Invalid section password');
        }
    };




    const urgentAcrossAll = allSectionsOrders.filter(order => {
        if (order.status !== 'PENDING' && order.status !== 'FORWARDED') return false;
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        const submittedTime = order.submittedAt?.seconds * 1000 || Date.now();
        return (submittedTime < threeDaysAgo) || (Number(order.forwardCount || 0) >= 3);
    });

    return (
        <div className="space-y-8">
            {isHodAuthenticated && !selectedSection && !showAttentionOnly && (
                <div className="flex justify-center mb-8">
                    <button
                        onClick={() => setShowAttentionOnly(true)}
                        className="group relative flex items-center gap-4 bg-slate-600 text-white px-8 py-5 rounded-3xl shadow-2xl hover:bg-slate-700 transition-all hover:scale-105 active:scale-95"
                    >
                        <AlertTriangle size={32} className="animate-pulse" />
                        <div className="text-left">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Attention Required List</h3>
                            <p className="text-xs font-bold text-slate-100 uppercase opacity-80">
                                {urgentAcrossAll.length} urgent orders across all sections
                            </p>
                        </div>
                        <div className="ml-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-black">
                            {urgentAcrossAll.length}
                        </div>
                    </button>
                </div>
            )}

            {view === 'tenders' ? (
                <div className="p-4 md:p-8">
                    <TendersPortal
                        section={selectedSection}
                        location={selectedLocation}
                        isHod={isHodAuthenticated}
                        onBack={() => {
                            setView('sections');
                            if (!isHodAuthenticated) {
                                setSelectedSection(null);
                                setSelectedLocation(null);
                                setIsSectionAuthenticated(false);
                            }
                        }}
                    />
                </div>
            ) : !selectedSection && !showAttentionOnly ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {SECTIONS.map((section) => (
                        <div
                            key={section.id}
                            onClick={() => {
                                setSelectedSection(section.id);
                                if (isHodAuthenticated) {
                                    setIsSectionAuthenticated(true);
                                }
                                if (section.id === 'civil' || section.id === 'electrical') {
                                    setShowAreaSelection(true);
                                }
                            }}
                            className="section-card"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Folder size={24} />
                                </div>
                                {counts[section.id]?.total > 0 && (
                                    <span className="bg-red-500 text-white text-sm font-black px-3 py-1.5 rounded-full animate-pulse shadow-lg">
                                        {counts[section.id].total} NEW
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-blue-900 mb-1">{section.name}</h3>
                            {section.id !== 'hod' && (
                                <div className="space-y-1 mt-4">
                                    <p className="text-xl font-bold text-blue-900 leading-tight">1) LAB (In campus): <span className="text-primary">{counts[section.id]?.lab || 0}</span></p>
                                    {!section.labOnly && (
                                        <p className="text-xl font-bold text-blue-900 leading-tight">2) Staff Quarters & Out Campus: <span className="text-primary">{counts[section.id]?.quarter || 0}</span></p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {isHodAuthenticated && (
                        <div
                            onClick={() => {
                                setView('tenders');
                            }}
                            className="section-card border-4 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center py-12"
                        >
                            <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mb-4 relative">
                                <FileText size={32} />
                                {attentionTendersCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-pulse border-2 border-white">
                                        {attentionTendersCount}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-2xl font-black text-primary uppercase">Tenders(W&S)</h3>
                            <p className="text-xs font-bold text-slate-400 mt-2 uppercase">Global Tender Management</p>
                        </div>
                    )}
                </div>
            ) : showAttentionOnly ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-blue-900 uppercase">Attention Required Orders</h2>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Urgent orders across all sections</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAttentionOnly(false)}
                            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all"
                        >
                            Back to Sections
                        </button>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="py-6 px-4 font-black">DATE & SECTION</th>
                                        <th className="py-6 px-4 font-black">LOCATION</th>
                                        <th className="py-6 px-4 font-black">DEPARTMENT</th>
                                        <th className="py-6 px-4 font-black">REQUESTER</th>
                                        <th className="py-6 px-4 font-black">REASON</th>
                                        <th className="py-6 px-4 text-right font-black">DETAILS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {urgentAcrossAll.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-20">
                                                    <CheckCircle size={48} />
                                                    <p className="text-xl font-black uppercase">No urgent orders found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        urgentAcrossAll.map((order) => (
                                            <tr
                                                key={order.id}
                                                onClick={() => setSelectedOrderDetail(order)}
                                                className="hover:bg-slate-100/50 transition-colors cursor-pointer group"
                                            >
                                                <td className="py-6 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-base font-black text-esd-dark">
                                                            {new Date(order.submittedAt?.seconds * 1000).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md w-fit mt-1 uppercase">
                                                            {SECTIONS.find(s => s.id === order.sectionId)?.name.split(' ')[0]}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-6 px-4">
                                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${order.location === 'lab' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                                        {order.location === 'lab' ? 'In Campus' : 'Out Campus'}
                                                    </span>
                                                </td>
                                                <td className="py-6 px-4 text-base font-black text-blue-900">
                                                    {order.department || order.quarter}
                                                </td>
                                                <td className="py-6 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-esd-dark">{order.requesterName}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{order.requesterPhone}</span>
                                                    </div>
                                                </td>
                                                <td className="py-6 px-4">
                                                    <span className="text-xs font-black text-slate-500 uppercase flex items-center gap-1">
                                                        {Number(order.forwardCount || 0) >= 3 ? (
                                                            <>Forwarded {order.forwardCount}x</>
                                                        ) : (
                                                            <>Over 3 days pending</>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="py-6 px-4 text-right">
                                                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                                        <ChevronRight size={20} className="text-slate-400" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : showAreaSelection ? (
                <div className="flex flex-col items-center justify-center py-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-3xl"
                    >
                        {/* Section Icon Node */}
                        <div className="flex flex-col items-center mb-8 relative">
                            <div className="w-20 h-20 bg-blue-900 text-white rounded-3xl flex items-center justify-center shadow-xl z-10">
                                {(() => {
                                    const section = SECTIONS.find(s => s.id === selectedSection);
                                    const icons = { Folder, Construction, Zap, Wind, Wrench, Hammer, FileText, Microscope };
                                    const IconComponent = icons[section?.icon] || Folder;
                                    return <IconComponent size={40} />;
                                })()}
                            </div>
                            <h2 className="text-2xl font-black text-blue-900 mt-4 text-center uppercase tracking-tight">
                                {SECTIONS.find(s => s.id === selectedSection)?.name}
                            </h2>
                            {/* Vertical Line Connector */}
                            <div className="h-12 w-1 bg-blue-900/10 mt-2"></div>
                        </div>

                        {/* Branching UI */}
                        <div className="relative">
                            {/* Horizontal Connector Line */}
                            <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-blue-900/10"></div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10">
                                {/* Option: LAB */}
                                <div className="relative flex flex-col items-center">
                                    <div className="absolute -top-10 left-1/2 w-1 h-10 bg-blue-900/10"></div>
                                    <button
                                        onClick={() => {
                                            setSelectedLocation('lab'); // Changed from setLocationFilter
                                            setShowAreaSelection(false);
                                            // Only go to action selection if already authenticated
                                            if (isSectionAuthenticated) {
                                                setShowActionSelection(true);
                                            }
                                        }}
                                        className="section-card w-full hover:scale-105 transition-all duration-300 group"
                                    >
                                        <h3 className="text-xl font-black text-blue-900 mb-6 uppercase tracking-tighter">1) LAB (In campus)</h3>
                                        <div className="flex flex-col items-center">
                                            <span className="text-7xl font-black text-primary mb-2">
                                                {counts[selectedSection]?.lab || 0}
                                            </span>
                                            <p className="text-base font-black text-slate-400 uppercase tracking-widest text-center">Pending Orders</p>
                                        </div>
                                    </button>
                                </div>

                                {/* Option: Out Campus */}
                                <div className="relative flex flex-col items-center">
                                    <div className="absolute -top-10 left-1/2 w-1 h-10 bg-blue-900/10"></div>
                                    <button
                                        onClick={() => {
                                            setSelectedLocation('quarter'); // Changed from setLocationFilter
                                            setShowAreaSelection(false);
                                            // Only go to action selection if already authenticated
                                            if (isSectionAuthenticated) {
                                                setShowActionSelection(true);
                                            }
                                        }}
                                        className="section-card w-full hover:scale-105 transition-all duration-300 group"
                                    >
                                        <h3 className="text-xl font-black text-blue-900 mb-6 uppercase tracking-tighter">2) Staff Quarters & Out Campus</h3>
                                        <div className="flex flex-col items-center">
                                            <span className="text-7xl font-black text-primary mb-2">
                                                {counts[selectedSection]?.quarter || 0}
                                            </span>
                                            <p className="text-base font-black text-slate-400 uppercase tracking-widest text-center">Pending Orders</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 text-center flex gap-4 justify-center">
                            <button
                                onClick={() => {
                                    setSelectedSection(null);
                                    setIsSectionAuthenticated(false);
                                    setShowAreaSelection(false);
                                }}
                                className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                            >
                                Back to Sections
                            </button>
                            {/* Tenders button for section actions */}
                            <button
                                onClick={() => {
                                    setView('tenders');
                                    setShowAreaSelection(false); // Hide area selection when going to tenders
                                }}
                                className="flex items-center justify-center gap-2 px-8 py-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all font-bold uppercase"
                            >
                                <FileText size={20} />
                                Tenders(W&S)
                            </button>
                        </div>
                    </motion.div>
                </div>
            ) : (!isSectionAuthenticated && !isHodAuthenticated) ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="glass-card p-8 rounded-3xl shadow-xl w-full max-w-sm text-center border-4 border-primary"
                    >
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Lock size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-blue-900 mb-2">Section Login</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Enter password for {SECTIONS.find(s => s.id === selectedSection)?.name}
                            {(selectedSection === 'civil' || selectedSection === 'electrical') && (
                                <span className="block text-[10px] font-black text-primary mt-1 uppercase">
                                    ({selectedLocation === 'lab' ? 'In Campus' : 'Out Campus'}) {/* Changed from locationFilter */}
                                </span>
                            )}
                        </p>

                        {sectionAuthError && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 italic font-bold">
                                {sectionAuthError}
                            </div>
                        )}

                        <input
                            type="password"
                            placeholder="Section Password"
                            className="input-field mb-4 text-center"
                            value={sectionPass}
                            onChange={(e) => setSectionPass(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSectionLogin()}
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    if (selectedSection === 'civil' || selectedSection === 'electrical') {
                                        setShowAreaSelection(true);
                                    } else {
                                        setSelectedSection(null);
                                    }
                                }}
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold"
                            >
                                Back
                            </button>
                            <button onClick={handleSectionLogin} className="flex-2 btn-primary py-3">Login</button>
                        </div>
                    </motion.div>
                </div>
            ) : showActionSelection ? (
                <div className="flex flex-col items-center justify-center py-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-4xl"
                    >
                        <div className="text-center mb-10">
                            <h2 className="text-4xl font-black text-blue-900 uppercase tracking-tighter">Select Action</h2>
                            <p className="text-slate-400 font-bold mt-2">
                                For {SECTIONS.find(s => s.id === selectedSection)?.name} ({selectedLocation === 'lab' ? 'In Campus' : 'Out Campus'}) {/* Changed from locationFilter */}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {[
                                { id: 'PENDING', name: 'Pending Orders', icon: Clock },
                                { id: 'COMPLETED', name: 'Completed list', icon: CheckCircle },
                                { id: 'USED MATERIAL', name: 'Used Material', icon: FileText },
                                { id: 'INVENTORY', name: 'Section Inventory', icon: Package },
                                { id: 'INSPECTION', name: 'Inspection', icon: Camera },
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const pendingCount = filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').length;
                                const completedCount = filteredOrders.filter(o => {
                                    if (o.status !== 'COMPLETED' || !o.completedAt) return false;
                                    const date = o.completedAt?.toDate ? o.completedAt.toDate() : new Date(o.completedAt.seconds * 1000);
                                    const now = new Date();
                                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                                }).length;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setShowActionSelection(false);
                                        }}
                                        className="section-card group hover:scale-105 transition-all duration-300 h-full py-8 relative overflow-visible"
                                    >
                                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative">
                                            <Icon size={32} />
                                            {tab.id === 'PENDING' && pendingCount > 0 && (
                                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-pulse border-2 border-white">
                                                    {pendingCount}
                                                </span>
                                            )}
                                            {tab.id === 'COMPLETED' && completedCount > 0 && (
                                                <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                                    {completedCount}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-base font-black text-blue-900 text-center uppercase tracking-tighter leading-tight">
                                            {tab.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-12 text-center">
                            <button
                                onClick={() => {
                                    if (isLabOnly) {
                                        setIsSectionAuthenticated(false);
                                    } else {
                                        setShowAreaSelection(true);
                                    }
                                    setShowActionSelection(false);
                                }}
                                className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                            >
                                Back
                            </button>
                        </div>
                    </motion.div>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Section Header */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setShowActionSelection(true);
                                    }}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                                >
                                    <ChevronRight size={20} className="rotate-180" />
                                </button>
                                <h2 className="text-2xl font-bold text-blue-900">
                                    {SECTIONS.find(s => s.id === selectedSection)?.name}
                                    {(selectedSection === 'civil' || selectedSection === 'electrical') && (
                                        <span className="text-primary ml-2 uppercase text-lg">
                                            - {selectedLocation === 'lab' ? 'In Campus (LAB)' : 'Staff Quarters & Out Campus'} {/* Changed from locationFilter */}
                                        </span>
                                    )}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {isHodAuthenticated && (
                                    <button
                                        onClick={() => setView('tenders')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all font-bold text-[10px] uppercase"
                                    >
                                        <FileText size={14} />
                                        Tenders(W&S)
                                    </button>
                                )}
                                {!hideCreation && (
                                    <button
                                        onClick={async () => {
                                            const sample = {
                                                location: selectedLocation, // Use current filter for sample // Changed from locationFilter
                                                section: selectedSection,
                                                department: selectedLocation === 'lab' ? 'Sample Lab' : 'Sample Qtr', // Changed from locationFilter
                                                requirement: 'Sample work order for testing',
                                                status: 'PENDING'
                                            };
                                            try {
                                                await submitWorkOrder(sample);
                                            } catch (e) {
                                                alert("Demo Mode: " + e.message);
                                            }
                                        }}
                                        className="text-[10px] font-bold text-primary hover:underline"
                                    >
                                        + Add Sample Order
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Dashboard Stats - Only show if NOT civil/electrical (where views are isolated) */}
                        {!(selectedSection === 'civil' || selectedSection === 'electrical') && (
                            <div className="grid grid-cols-2 gap-2 mb-4 max-w-sm">
                                {/* Pending */}
                                <div onClick={() => setActiveTab('PENDING')} className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${activeTab === 'PENDING' ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-slate-100 hover:border-primary/50'}`}>
                                    <div className="flex items-center justify-between mb-0.5">
                                        <Clock size={14} className={`${activeTab === 'PENDING' ? 'text-white' : 'text-slate-400'}`} />
                                        {filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').length > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse shadow-md">
                                                {filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').length} NEW
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-sm font-black uppercase tracking-tight ${activeTab === 'PENDING' ? 'text-white/80' : 'text-slate-500'}`}>Pending</p>
                                    <h3 className="text-4xl font-black tracking-tighter">{filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').length}</h3>
                                </div>

                                {/* Completed (Current Month Only) */}
                                <div onClick={() => setActiveTab('COMPLETED')} className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${activeTab === 'COMPLETED' ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-slate-100 hover:border-primary/50'}`}>
                                    <div className="flex items-center justify-between mb-0.5">
                                        <CheckCircle size={16} className={`${activeTab === 'COMPLETED' ? 'text-white' : 'text-slate-400'}`} />
                                    </div>
                                    <p className={`text-sm font-black uppercase tracking-tight ${activeTab === 'COMPLETED' ? 'text-white/80' : 'text-slate-500'}`}>Completed</p>
                                    <h3 className="text-4xl font-black tracking-tighter">
                                        {filteredOrders.filter(o => {
                                            if (o.status !== 'COMPLETED' || !o.completedAt) return false;
                                            const date = o.completedAt?.toDate ? o.completedAt.toDate() : new Date(o.completedAt.seconds * 1000);
                                            const now = new Date();
                                            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                                        }).length}
                                    </h3>
                                </div>
                            </div>
                        )}

                        {/* Location Toggles - Hide if civil/electrical (where views are isolated) */}
                        {!(selectedSection === 'civil' || selectedSection === 'electrical') && (
                            !isLabOnly ? (
                                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                                    <button
                                        onClick={() => setSelectedLocation('lab')} // Changed from setLocationFilter
                                        className={`px-6 py-2.5 rounded-lg text-base font-bold transition-all ${selectedLocation === 'lab' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-esd-dark' // Changed from locationFilter
                                            }`}
                                    >
                                        In Campus (LAB)
                                    </button>
                                    <button
                                        onClick={() => setSelectedLocation('quarter')} // Changed from setLocationFilter
                                        className={`px-6 py-2.5 rounded-lg text-base font-bold transition-all ${selectedLocation !== 'lab' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-esd-dark' // Changed from locationFilter
                                            }`}
                                    >
                                        Staff Quarters & Out Campus
                                    </button>
                                </div>
                            ) : (
                                <div className="px-6 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-base font-bold w-fit border border-blue-100">
                                    View: In Campus (LAB)
                                </div>
                            )
                        )}
                    </div>

                    {/* Admin Tabs - Only show if NOT civil/electrical (where views are isolated) */}
                    {!(selectedSection === 'civil' || selectedSection === 'electrical') && (
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit overflow-x-auto max-w-full">
                            {[
                                'PENDING',
                                'COMPLETED', 'USED MATERIAL', 'INVENTORY', 'INSPECTION'
                            ].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-3 rounded-xl text-base font-black transition-all ${activeTab === tab
                                        ? 'bg-white text-primary shadow-sm scale-105'
                                        : 'text-slate-500 hover:text-esd-dark'
                                        }`}
                                >
                                    {tab}
                                    {tab === 'PENDING' && filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').length > 0 && (
                                        <span className="ml-2 text-red-500 animate-pulse">●</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tab Content */}
                    <div className="glass-card rounded-3xl p-6 min-h-[400px]">
                        {activeTab === 'PENDING' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="font-black text-slate-400 text-base uppercase tracking-wider">
                                        Pending Orders ({selectedLocation === 'lab' ? 'In Campus' : 'Out Campus'}) ({filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').length}) {/* Changed from locationFilter */}
                                    </h4>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" placeholder="Search orders..." className="pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-base outline-none focus:ring-2 focus:ring-primary/20 w-64 shadow-inner" />
                                    </div>
                                </div>

                                {filteredOrders.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <Clock size={48} className="mx-auto text-slate-200 mb-4" />
                                        <p className="text-slate-400">No pending work orders in this {selectedLocation === 'lab' ? 'In Campus' : 'Out Campus'}.</p> {/* Changed from locationFilter */}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-slate-400 text-sm font-black border-b border-slate-100 uppercase tracking-widest">
                                                    <th className="pb-6 px-4 font-black">DATE</th>
                                                    <th className="pb-6 px-4 font-black text-center">IMG</th>
                                                    <th className="pb-6 px-4 font-black">LOCATION</th>
                                                    <th className="pb-6 px-4 font-black">DETAIL</th>
                                                    <th className="pb-6 px-4 font-black">REQUESTER</th>
                                                    <th className="pb-6 px-4 font-black">REQUIREMENT</th>
                                                    <th className="pb-6 px-4 text-right font-black">ACTIONS</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').map((order) => {
                                                    const isEscalated = () => {
                                                        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
                                                        const submittedTime = order.submittedAt?.seconds * 1000 || Date.now();
                                                        return (submittedTime < threeDaysAgo) || (Number(order.forwardCount || 0) >= 3);
                                                    };
                                                    const attention = isEscalated();

                                                    return (
                                                        <tr
                                                            key={order.id}
                                                            onClick={() => setSelectedOrderDetail(order)}
                                                            className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${attention ? 'bg-slate-100/50' : ''}`}
                                                        >
                                                            <td className="py-6 px-4 text-base font-black text-esd-dark">
                                                                <div className="flex items-center gap-2">
                                                                    {attention && <AlertTriangle size={18} className="text-slate-500 animate-pulse" />}
                                                                    {new Date(order.submittedAt?.seconds * 1000).toLocaleDateString()}
                                                                </div>
                                                                {/* Show Received From Badge */}
                                                                {order.previousSection && (
                                                                    <span className="block text-[11px] font-black text-purple-600 bg-purple-100 px-2 py-1 rounded-lg mt-2 w-fit uppercase tracking-tighter shadow-sm border border-purple-200">
                                                                        from {SECTIONS.find(s => s.id === order.previousSection)?.name || order.previousSection}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-4 px-4 text-center">
                                                                {order.attachmentUrl ? (
                                                                    <button
                                                                        onClick={() => setSelectedImage(order.attachmentUrl)}
                                                                        className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center hover:scale-110 transition-transform mx-auto"
                                                                    >
                                                                        <Camera size={16} />
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-slate-200">-</span>
                                                                )}
                                                            </td>
                                                            <td className="py-6 px-4">
                                                                <span className={`text-[11px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm ${order.location === 'lab' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-orange-100 text-orange-600 border border-orange-200'}`}>
                                                                    {order.location === 'lab' ? 'In Campus' : 'Out Campus'}
                                                                </span>
                                                            </td>
                                                            <td className="py-6 px-4 text-base font-black text-blue-900">
                                                                <div>{order.department || order.quarter}</div>
                                                                {order.building && (
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                                                        {order.building} {order.roomNo ? `| Room: ${order.roomNo}` : ''}
                                                                    </div>
                                                                )}
                                                                {isEscalated() && (
                                                                    <span className="text-xs font-black text-slate-500 uppercase flex items-center gap-1 mt-1">
                                                                        <Clock size={12} /> Attention Required
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-6 px-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-base font-black text-blue-900 uppercase tracking-tighter">{order.requesterName || 'N/A'}</span>
                                                                    <a href={`tel:${order.requesterPhone}`} className="text-xs text-primary hover:underline font-black mt-1">
                                                                        {order.requesterPhone}
                                                                    </a>
                                                                </div>
                                                            </td>
                                                            <td className="py-6 px-4 text-base font-bold text-slate-600 max-w-xs truncate italic">
                                                                "{order.requirement}"
                                                            </td>
                                                            <td className="py-6 px-4 text-right">
                                                                <div className="flex flex-col items-end gap-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setCompletionOrder(order);
                                                                        }}
                                                                        className="px-4 py-2 bg-primary text-white font-black text-xs rounded-xl hover:scale-105 transition-all shadow-md uppercase tracking-widest"
                                                                    >
                                                                        Complete
                                                                    </button>
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            if (confirm('Delete this work order permanently?')) {
                                                                                try {
                                                                                    await deleteWorkOrderForever(order.id);
                                                                                    alert("Order Deleted Forever!");
                                                                                } catch (err) {
                                                                                    alert("Error deleting: " + err.message);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="px-4 py-2 bg-red-600 text-white font-black text-xs rounded-xl hover:scale-105 transition-all shadow-md uppercase tracking-widest"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                    <select
                                                                        className="text-xs font-black text-slate-600 bg-white border-2 border-slate-100 rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-primary hover:text-primary transition-all uppercase tracking-widest"
                                                                        defaultValue=""
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onChange={(e) => {
                                                                            const targetSection = e.target.value;
                                                                            if (targetSection) {
                                                                                setForwardingOrder(order);
                                                                                setForwardingTarget(targetSection);
                                                                                e.target.value = "";
                                                                            }
                                                                        }}
                                                                    >
                                                                        <option value="" disabled>Forward to...</option>
                                                                        {SECTIONS.filter(s => s.id !== selectedSection && s.id !== 'hod').map(s => (
                                                                            <option key={s.id} value={s.id}>{s.name.replace(' section', '')}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'ELECTRICAL' && (
                            <ElectricalSpecifics />
                        )}

                        {activeTab === 'COMPLETED' && (
                            <SummarizedView
                                type="COMPLETED"
                                // Combine local completed orders with orders forwarded OUT of this section
                                items={[
                                    ...filteredOrders.filter(o => o.status === 'COMPLETED'),
                                    ...filteredForwardedOut.map(o => ({
                                        ...o,
                                        // Modify requirement/display to show 'Forwarded To X' for clarity in the list
                                        status: `Forwarded to ${SECTIONS.find(s => s.id === o.section)?.name || o.section}`
                                    }))
                                ]}
                                onItemClick={(order) => setSelectedOrderDetail(order)}
                            />
                        )}

                        {activeTab === 'USED MATERIAL' && (
                            <SummarizedView
                                type="USED MATERIAL"
                                items={filteredOrders.filter(o => o.status === 'COMPLETED' && o.materials?.length > 0)}
                                onItemClick={(order) => setSelectedOrderDetail(order)}
                            />
                        )}


                        {activeTab === 'INVENTORY' && (
                            <InventoryView items={[]} location={locationFilter} />
                        )}

                        {activeTab === 'INSPECTION' && (
                            <InspectionView />
                        )}
                    </div>
                </motion.div>
            )}

            {completionOrder && (
                <CompletionModal
                    order={completionOrder}
                    onCancel={() => setCompletionOrder(null)}
                    onComplete={async (data) => {
                        try {
                            await completeWorkOrder(completionOrder.id, data)
                            setCompletionOrder(null)
                            alert("Work Order Completed!")
                        } catch (e) {
                            alert("Error completing order: " + e.message)
                        }
                    }}
                />
            )}

            {forwardingOrder && (
                <ForwardingModal
                    order={forwardingOrder}
                    targetSectionName={SECTIONS.find(s => s.id === forwardingTarget)?.name}
                    onCancel={() => {
                        setForwardingOrder(null);
                        setForwardingTarget(null);
                    }}
                    onForward={async (materials) => {
                        try {
                            // Pass current selectedSection as the previousSection
                            await forwardWorkOrder(forwardingOrder.id, forwardingTarget, selectedSection, materials);
                            setForwardingOrder(null);
                            setForwardingTarget(null);
                            alert("Order Forwarded Successfully!");
                        } catch (err) {
                            alert("Error forwarding: " + err.message);
                        }
                    }}
                />
            )}

            {/* Image Viewer Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-esd-dark/90 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative max-w-4xl w-full h-full flex flex-col items-center justify-center"
                    >
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-0 right-0 p-3 text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={32} />
                        </button>
                        <img
                            src={selectedImage}
                            alt="Attachment"
                            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                        />
                    </motion.div>
                </div>
            )}

            {/* Work Order Detail Modal */}
            {selectedOrderDetail && (
                <WorkOrderDetailModal
                    order={selectedOrderDetail}
                    onClose={() => setSelectedOrderDetail(null)}
                />
            )}
        </div>
    )
}

export default AdminDashboard
