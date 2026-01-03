import { useState } from 'react'
import { CheckCircle, Package, Search } from 'lucide-react'

const SummarizedView = ({ type, items = [] }) => {
    const [searchTerm, setSearchTerm] = useState('')

    const filtered = items.filter(o =>
        o.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.requirement?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-slate-400 text-sm uppercase tracking-wider">{type} ({filtered.length})</h4>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder={`Search ${type}...`}
                        className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
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
                            <tr className="text-slate-400 text-xs font-bold border-b border-slate-100">
                                <th className="pb-4 px-4 font-bold">DATE</th>
                                <th className="pb-4 px-4 font-bold">DETAIL</th>
                                {type === 'COMPLETED' ? <th className="pb-4 px-4 font-bold">REQUIREMENT</th> : <th className="pb-4 px-4 font-bold">MATERIALS USED</th>}
                                <th className="pb-4 px-4 text-right font-bold">STATUS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-4 text-sm font-medium">
                                        {item.completedAt ? new Date(item.completedAt?.seconds * 1000).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="py-4 px-4 text-sm font-bold text-esd-dark">
                                        {item.department || item.quarter}
                                    </td>
                                    <td className="py-4 px-4 text-sm text-slate-500 max-w-xs truncate">
                                        {type === 'COMPLETED' ? item.requirement : item.materials?.map(m => `${m.name} (${m.quantity} ${m.unit || 'Nos'})`).join(', ')}
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className="px-2 py-1 bg-green-100 text-green-600 rounded-md text-[10px] font-bold uppercase">
                                            {type}
                                        </span>
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

export default SummarizedView
