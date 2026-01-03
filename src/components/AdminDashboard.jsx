import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Folder, ChevronRight, Clock, CheckCircle, FileText, Package, Archive, Search } from 'lucide-react'
import InventoryView from './InventoryView'
import ArchiveView from './ArchiveView'
import SummarizedView from './SummarizedView'
import { subscribeToOrders, completeWorkOrder, archiveWorkOrder, restoreWorkOrder, deleteWorkOrderForever, submitWorkOrder, forwardWorkOrder, subscribeToForwardedFrom } from '../services/orderService'
import CompletionModal from './CompletionModal'
import InspectionView from './InspectionView';
import ForwardingModal from './ForwardingModal'
import ElectricalSpecifics from './ElectricalSpecifics'
import { SECTIONS } from '../constants'

const AdminDashboard = ({ hideCreation = false }) => {
    const [selectedSection, setSelectedSection] = useState(null)
    const [locationFilter, setLocationFilter] = useState('lab') // 'lab' or 'quarter'
    const [activeTab, setActiveTab] = useState('PENDING')
    const [orders, setOrders] = useState([])
    const [forwardedOutOrders, setForwardedOutOrders] = useState([]) // Orders forwarded FROM this section
    const [counts, setCounts] = useState({})
    const [completionOrder, setCompletionOrder] = useState(null)
    const [forwardingOrder, setForwardingOrder] = useState(null)
    const [forwardingTarget, setForwardingTarget] = useState(null)

    useEffect(() => {
        // In a real app, we'd have a specific collection for counters or aggregate
        // For this demo, we'll fetch pending counts for each section
        const unsubscribes = SECTIONS.map(section =>
            subscribeToOrders(section.id, (data) => {
                setCounts(prev => ({
                    ...prev,
                    [section.id]: data.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').length
                }))
            })
        )
        return () => unsubscribes.forEach(u => u())
    }, [])

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
    const filteredOrders = orders.filter(o =>
        locationFilter === 'lab' ? o.location === 'lab' : o.location !== 'lab'
    );

    // Also filter forwarded orders logic?? 
    // Usually forwarded orders should also stay in their location track
    const filteredForwardedOut = forwardedOutOrders.filter(o =>
        locationFilter === 'lab' ? o.location === 'lab' : o.location !== 'lab'
    );

    return (
        <div className="space-y-8">
            {!selectedSection ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {SECTIONS.map((section) => (
                        <div
                            key={section.id}
                            onClick={() => setSelectedSection(section.id)}
                            className="glass-card p-6 rounded-2xl cursor-pointer hover:bg-primary/5 transition-all group border-2 border-transparent hover:border-primary"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Folder size={24} />
                                </div>
                                {counts[section.id] > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                        {counts[section.id]} NEW
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-esd-dark mb-1">{section.name}</h3>
                            <p className="text-sm text-slate-400">View and manage work orders</p>
                        </div>
                    ))}
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
                                    onClick={() => setSelectedSection(null)}
                                    className="text-slate-400 hover:text-esd-dark transition-colors"
                                >
                                    Folders
                                </button>
                                <ChevronRight size={16} className="text-slate-300" />
                                <h2 className="text-2xl font-bold text-esd-dark">
                                    {SECTIONS.find(s => s.id === selectedSection)?.name}
                                </h2>
                            </div>
                            {!hideCreation && (
                                <button
                                    onClick={async () => {
                                        const sample = {
                                            location: locationFilter, // Use current filter for sample
                                            section: selectedSection,
                                            department: locationFilter === 'lab' ? 'Sample Lab' : 'Sample Qtr',
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

                        {/* Dashboard Stats / Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                            {/* Pending */}
                            <div onClick={() => setActiveTab('PENDING')} className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${activeTab === 'PENDING' ? 'bg-primary border-primary text-white shadow-xl scale-105' : 'bg-white border-slate-100 hover:border-primary/50'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <Clock size={24} className={`${activeTab === 'PENDING' ? 'text-white' : 'text-slate-400'}`} />
                                    {filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').length > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                            {filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').length} NEW
                                        </span>
                                    )}
                                </div>
                                <p className={`text-sm ${activeTab === 'PENDING' ? 'text-white/80' : 'text-slate-500'}`}>Pending Orders</p>
                                <h3 className="text-3xl font-bold">{filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').length}</h3>
                            </div>

                            {/* Completed */}
                            <div onClick={() => setActiveTab('COMPLETED')} className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${activeTab === 'COMPLETED' ? 'bg-primary border-primary text-white shadow-xl scale-105' : 'bg-white border-slate-100 hover:border-primary/50'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <CheckCircle size={24} className={`${activeTab === 'COMPLETED' ? 'text-white' : 'text-slate-400'}`} />
                                </div>
                                <p className={`text-sm ${activeTab === 'COMPLETED' ? 'text-white/80' : 'text-slate-500'}`}>Completed Orders</p>
                                <h3 className="text-3xl font-bold">{filteredOrders.filter(o => o.status === 'COMPLETED').length}</h3>
                            </div>

                            {/* Used Material */}
                            <div onClick={() => setActiveTab('USED MATERIAL')} className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${activeTab === 'USED MATERIAL' ? 'bg-primary border-primary text-white shadow-xl scale-105' : 'bg-white border-slate-100 hover:border-primary/50'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <FileText size={24} className={`${activeTab === 'USED MATERIAL' ? 'text-white' : 'text-slate-400'}`} />
                                </div>
                                <p className={`text-sm ${activeTab === 'USED MATERIAL' ? 'text-white/80' : 'text-slate-500'}`}>Used Material</p>
                                <h3 className="text-3xl font-bold">{filteredOrders.filter(o => o.status === 'COMPLETED' && o.materials?.length > 0).length}</h3>
                            </div>

                            {/* Inventory */}
                            <div onClick={() => setActiveTab('INVENTORY')} className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${activeTab === 'INVENTORY' ? 'bg-primary border-primary text-white shadow-xl scale-105' : 'bg-white border-slate-100 hover:border-primary/50'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <Package size={24} className={`${activeTab === 'INVENTORY' ? 'text-white' : 'text-slate-400'}`} />
                                </div>
                                <p className={`text-sm ${activeTab === 'INVENTORY' ? 'text-white/80' : 'text-slate-500'}`}>Inventory Items</p>
                                <h3 className="text-3xl font-bold">0</h3> {/* Placeholder, actual count would come from InventoryView */}
                            </div>
                        </div>

                        {/* Location Toggles */}
                        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                            <button
                                onClick={() => setLocationFilter('lab')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${locationFilter === 'lab' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-esd-dark'
                                    }`}
                            >
                                LAB
                            </button>
                            <button
                                onClick={() => setLocationFilter('quarter')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${locationFilter !== 'lab' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-esd-dark'
                                    }`}
                            >
                                STAFF QUARTERS & OUTSIDE CAMPUS
                            </button>
                        </div>
                    </div>

                    {/* Admin Tabs */}
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit overflow-x-auto max-w-full">
                        {[
                            'PENDING',
                            ...(selectedSection === 'electrical' ? ['ELECTRICAL'] : []),
                            'COMPLETED', 'USED MATERIAL', 'INVENTORY', 'ARCHIVE', 'INSPECTION'
                        ].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab
                                    ? 'bg-white text-primary shadow-sm'
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

                    {/* Tab Content */}
                    <div className="glass-card rounded-3xl p-6 min-h-[400px]">
                        {activeTab === 'PENDING' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="font-bold text-slate-400 text-sm uppercase tracking-wider">
                                        Pending Orders ({locationFilter === 'lab' ? 'LAB' : 'QUARTERS'}) ({filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').length})
                                    </h4>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input type="text" placeholder="Search orders..." className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                    </div>
                                </div>

                                {filteredOrders.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <Clock size={48} className="mx-auto text-slate-200 mb-4" />
                                        <p className="text-slate-400">No pending work orders in this {locationFilter === 'lab' ? 'LAB' : 'section'}.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-slate-400 text-xs font-bold border-b border-slate-100">
                                                    <th className="pb-4 px-4 font-bold">DATE</th>
                                                    <th className="pb-4 px-4 font-bold">LOCATION</th>
                                                    <th className="pb-4 px-4 font-bold">DETAIL</th>
                                                    <th className="pb-4 px-4 font-bold">REQUIREMENT</th>
                                                    <th className="pb-4 px-4 text-right font-bold">ACTIONS</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'FORWARDED').map((order) => (
                                                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="py-4 px-4 text-sm font-medium">
                                                            {new Date(order.submittedAt?.seconds * 1000).toLocaleDateString()}
                                                            {/* Show Received From Badge */}
                                                            {order.previousSection && (
                                                                <span className="block text-[10px] font-bold text-purple-600 bg-purple-100 px-1 py-0.5 rounded mt-1 w-fit">
                                                                    from {SECTIONS.find(s => s.id === order.previousSection)?.name || order.previousSection}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${order.location === 'lab' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                                                {order.location}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4 text-sm font-bold text-esd-dark">
                                                            {order.department || order.quarter}
                                                        </td>
                                                        <td className="py-4 px-4 text-sm text-slate-500 max-w-xs truncate">
                                                            {order.requirement}
                                                        </td>
                                                        <td className="py-4 px-4 text-right">
                                                            <div className="flex flex-col items-end gap-1">
                                                                <button
                                                                    onClick={() => setCompletionOrder(order)}
                                                                    className="text-primary font-bold text-sm hover:underline"
                                                                >
                                                                    Complete
                                                                </button>
                                                                <select
                                                                    className="text-sm font-bold text-slate-600 bg-white/50 border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-primary hover:text-primary transition-all mt-1"
                                                                    defaultValue=""
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
                                                                    {SECTIONS.filter(s => s.id !== selectedSection).map(s => (
                                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
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
                            />
                        )}

                        {activeTab === 'USED MATERIAL' && (
                            <SummarizedView
                                type="USED MATERIAL"
                                items={filteredOrders.filter(o => o.status === 'COMPLETED' && o.materials?.length > 0)}
                            />
                        )}

                        {activeTab === 'ARCHIVE' && (
                            <ArchiveView
                                orders={filteredOrders.filter(o => o.status === 'ARCHIVED')}
                                // ... handlers ...
                                onRestore={async (id) => {
                                    try { await restoreWorkOrder(id); alert('Restored!'); } catch (e) { alert(e.message); }
                                }}
                                onDelete={async (id) => {
                                    try { await deleteWorkOrderForever(id); alert('Deleted!'); } catch (e) { alert(e.message); }
                                }}
                            />
                        )}

                        {activeTab === 'INVENTORY' && (
                            <InventoryView items={[]} />
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
        </div>
    )
}

export default AdminDashboard
