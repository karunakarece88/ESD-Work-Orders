import { useState } from 'react'
import { motion } from 'framer-motion'
import { Archive as ArchiveIcon, Trash2, RefreshCcw, Search, Clock } from 'lucide-react'

const ArchiveView = ({ orders = [], onRestore, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('')

    const filtered = orders.filter(o =>
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.requirement?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-slate-400 text-sm uppercase tracking-wider">Archived Orders ({filtered.length})</h4>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search archive..."
                        className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <ArchiveIcon size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400">Archive is empty.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-400 text-xs font-bold border-b border-slate-100">
                                <th className="pb-4 px-4 font-bold">DATE</th>
                                <th className="pb-4 px-4 font-bold">DETAIL</th>
                                <th className="pb-4 px-4 font-bold">REQUIREMENT</th>
                                <th className="pb-4 px-4 text-right font-bold">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-4 text-sm font-medium">
                                        {order.submittedAt ? new Date(order.submittedAt?.seconds * 1000).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="py-4 px-4 text-sm font-bold text-esd-dark">
                                        {order.department || order.quarter}
                                    </td>
                                    <td className="py-4 px-4 text-sm text-slate-500 max-w-xs truncate">
                                        {order.requirement}
                                    </td>
                                    <td className="py-4 px-4 text-right space-x-2">
                                        <button
                                            onClick={() => onRestore(order.id)}
                                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            title="Restore"
                                        >
                                            <RefreshCcw size={18} />
                                        </button>
                                        <button
                                            onClick={() => { if (confirm('Delete forever?')) onDelete(order.id) }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Forever"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default ArchiveView
