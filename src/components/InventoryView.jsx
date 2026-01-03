import { useState } from 'react'
import { Search, Download, Table, Package } from 'lucide-react'

const InventoryView = ({ items = [] }) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [searchBy, setSearchBy] = useState('name') // 'name', 'quarter'

    const filteredItems = items.filter(item => {
        const target = searchBy === 'name' ? item.name : item.quarter
        return target?.toLowerCase().includes(searchTerm.toLowerCase())
    })

    const exportToCSV = () => {
        const headers = ["Date", "Material Name", "Quantity", "Unit", "Quarter/Area"]
        const rows = filteredItems.map(item => [
            item.date || new Date().toLocaleDateString(),
            item.name,
            item.quantity,
            item.unit || 'Nos',
            item.quarter || '-'
        ])

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `ESD_Inventory_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl">
                <div className="flex bg-white rounded-xl p-1 shadow-sm w-full sm:w-auto">
                    <button
                        onClick={() => setSearchBy('name')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${searchBy === 'name' ? 'bg-primary text-white' : 'text-slate-400'}`}
                    >
                        By Material
                    </button>
                    <button
                        onClick={() => setSearchBy('quarter')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${searchBy === 'quarter' ? 'bg-primary text-white' : 'text-slate-400'}`}
                    >
                        By Quarter
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder={`Search by ${searchBy}...`}
                            className="input-field pl-10 text-sm py-2"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="p-2.5 bg-white text-primary rounded-xl border border-slate-100 hover:border-primary transition-all shadow-sm flex items-center gap-2"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline text-xs font-bold">Export CSV</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                            <th className="pb-4 px-4">Material Name</th>
                            <th className="pb-4 px-4">Quantity</th>
                            <th className="pb-4 px-4">Latest Date</th>
                            <th className="pb-4 px-4">Location</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="py-20 text-center">
                                    <Package size={40} className="mx-auto text-slate-200 mb-2" />
                                    <p className="text-slate-400 text-sm">No inventory items found.</p>
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-4 font-bold text-esd-dark text-sm">{item.name}</td>
                                    <td className="py-4 px-4">
                                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold">
                                            {item.quantity} {item.unit || 'Nos'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-xs text-slate-500">{item.date || '-'}</td>
                                    <td className="py-4 px-4 text-xs font-bold text-slate-400 uppercase">{item.quarter || 'General'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default InventoryView
