import { useState } from 'react'
import { CheckCircle, Package, Search, AlertTriangle, Clock } from 'lucide-react'

const SummarizedView = ({ type, items = [], onItemClick }) => {
    const [searchTerm, setSearchTerm] = useState('')

    const filtered = items.filter(o =>
        o.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.requirement?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.building?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const isEscalated = (item) => {
        if (item.status === 'COMPLETED') return false;
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        const submittedTime = item.submittedAt?.seconds * 1000 || Date.now();
        return (submittedTime < threeDaysAgo) || (Number(item.forwardCount || 0) >= 3);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <h4 className="font-black text-slate-400 text-base uppercase tracking-wider">{type} ({filtered.length})</h4>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={`Search ${type}...`}
                        className="pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-base outline-none focus:ring-2 focus:ring-primary/20 w-64 shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    {type === 'COMPLETED' ? <CheckCircle size={48} className="mx-auto text-slate-200 mb-4" /> : <Package size={48} className="mx-auto text-slate-200 mb-4" />}
                    <p className="text-slate-400">No items found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-400 text-sm font-black border-b border-slate-100 uppercase tracking-widest">
                                <th className="pb-6 px-4 font-black">DATE</th>
                                <th className="pb-6 px-4 font-black">DETAIL</th>
                                <th className="pb-6 px-4 font-black">REQUESTER</th>
                                {type === 'COMPLETED' ? <th className="pb-6 px-4 font-black">REQUIREMENT</th> : <th className="pb-6 px-4 font-black">MATERIALS USED</th>}
                                <th className="pb-6 px-4 text-right font-black">STATUS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((item) => {
                                const attention = isEscalated(item);
                                return (
                                    <tr
                                        key={item.id}
                                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer group ${attention ? 'bg-slate-100/50' : ''}`}
                                        onClick={() => onItemClick?.(item)}
                                    >
                                        <td className="py-6 px-4 text-base font-black text-esd-dark">
                                            <div className="flex items-center gap-2">
                                                {attention && <AlertTriangle size={18} className="text-slate-500 animate-pulse" />}
                                                {item.completedAt ? new Date(item.completedAt?.seconds * 1000).toLocaleDateString() : (item.submittedAt ? new Date(item.submittedAt?.seconds * 1000).toLocaleDateString() : '-')}
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="flex flex-col">
                                                <span className="text-base font-black text-blue-900 leading-tight uppercase tracking-tighter">{item.department || item.quarter}</span>
                                                {item.building && (
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                                        {item.building} {item.roomNo ? `| Room: ${item.roomNo}` : ''}
                                                    </span>
                                                )}
                                                {attention && (
                                                    <span className="text-xs font-black text-slate-500 uppercase flex items-center gap-1 mt-1">
                                                        <Clock size={12} /> Attention Required
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="flex flex-col">
                                                <span className="text-base font-black text-blue-900 uppercase tracking-tighter">{item.requesterName || 'N/A'}</span>
                                                <span className="text-sm text-primary font-black mt-1">{item.requesterPhone || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4 text-base font-bold text-slate-600 max-w-xs truncate italic">
                                            {type === 'COMPLETED' ? `"${item.requirement}"` : item.materials?.map(m => `${m.name} (${m.quantity} ${m.unit || 'Nos'})`).join(', ')}
                                        </td>
                                        <td className="py-6 px-4 text-right">
                                            <span className="px-4 py-2 bg-green-100 text-green-600 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm border border-green-200">
                                                {type}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default SummarizedView
