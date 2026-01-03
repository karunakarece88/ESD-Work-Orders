import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, FileText, Send, Layers, X, ChevronRight, Search, Info } from 'lucide-react'
import { getIndents, addIndent, createGatePass } from '../services/orderService'
import { ELECTRICAL_MATERIALS } from '../materials'
import { QUARTERS } from '../constants'

const ElectricalSpecifics = () => {
    const [activeSubTab, setActiveSubTab] = useState('INDENTS')
    const [showForm, setShowForm] = useState(null) // 'indent', 'gatepass'
    const [indents, setIndents] = useState([])
    const [indentType, setIndentType] = useState('GEM')

    useEffect(() => {
        const unsubscribe = getIndents(indentType, (data) => setIndents(data))
        return () => unsubscribe()
    }, [indentType])

    return (
        <div className="space-y-6">
            <div className="flex gap-4 border-b border-slate-100 pb-4">
                {['INDENTS', 'GATEPASS'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        className={`text-sm font-bold transition-colors ${activeSubTab === tab ? 'text-primary' : 'text-slate-400 hover:text-slate-500'}`}
                    >
                        {tab === 'INDENTS' ? 'INDENTS (GEM/LOCAL)' : 'GATE PASS'}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeSubTab === 'INDENTS' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                <button onClick={() => setIndentType('GEM')} className={`px-4 py-2 rounded-xl text-xs font-bold ${indentType === 'GEM' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500'}`}>GEM</button>
                                <button onClick={() => setIndentType('Local')} className={`px-4 py-2 rounded-xl text-xs font-bold ${indentType === 'Local' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500'}`}>LOCAL</button>
                            </div>
                            <button
                                onClick={() => setShowForm('indent')}
                                className="btn-primary py-2 px-4 text-xs flex items-center gap-2"
                            >
                                <Plus size={14} /> New Indent
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {indents.length === 0 ? (
                                <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                    <Info size={40} className="mx-auto text-slate-200 mb-2" />
                                    <p className="text-slate-400">No {indentType} indents found.</p>
                                </div>
                            ) : (
                                indents.map(indent => (
                                    <div key={indent.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-esd-dark">{indent.indentName}</h4>
                                                <p className="text-xs text-slate-400">{indent.date}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 items-center">
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-slate-500">{indent.materials?.length || 0} Items</p>
                                            </div>
                                            <ChevronRight size={16} className="text-slate-300" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}

                {activeSubTab === 'GATEPASS' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowForm('gatepass')}
                                className="btn-primary py-2 px-4 text-xs flex items-center gap-2"
                            >
                                <Plus size={14} /> Issue Gate Pass
                            </button>
                        </div>

                        <div className="p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <Send size={40} className="mx-auto text-slate-200 mb-4" />
                            <h4 className="font-bold text-slate-400">Gate Pass History</h4>
                            <p className="text-sm text-slate-400 mt-2">Previous gate passes will appear here.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Forms Overlay */}
            {showForm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-esd-dark/60 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between mb-8">
                            <h3 className="text-xl font-bold">New {showForm === 'indent' ? indentType + ' Indent' : 'Gate Pass'}</h3>
                            <button onClick={() => setShowForm(null)}><X size={20} /></button>
                        </div>

                        {showForm === 'indent' ? (
                            <IndentForm onCancel={() => setShowForm(null)} type={indentType} />
                        ) : (
                            <GatePassForm onCancel={() => setShowForm(null)} indents={indents} />
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    )
}

const IndentForm = ({ onCancel, type }) => {
    const [formData, setFormData] = useState({ indentName: '', date: new Date().toISOString().split('T')[0], materials: [] })

    return (
        <div className="space-y-4">
            <input className="input-field" placeholder="Indent Name/Number (e.g. 01/2025)" value={formData.indentName} onChange={e => setFormData({ ...formData, indentName: e.target.value })} />
            <input className="input-field" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />

            <div className="pt-4">
                <button onClick={async () => {
                    await addIndent({ ...formData, type })
                    alert("Indent Saved!")
                    onCancel()
                }} className="btn-primary w-full">Save Indent</button>
            </div>
        </div>
    )
}

const GatePassForm = ({ onCancel }) => {
    const [formData, setFormData] = useState({ quarter: '', date: new Date().toISOString().split('T')[0], materials: [] })

    return (
        <div className="space-y-4">
            <div className="relative">
                <input
                    className="input-field"
                    placeholder="For Quarter/Area (e.g. C-1)"
                    value={formData.quarter}
                    onChange={e => setFormData({ ...formData, quarter: e.target.value })}
                />
                {formData.quarter && (
                    <div className="mt-2 max-h-40 overflow-y-auto bg-white border border-slate-100 rounded-xl shadow-sm">
                        {QUARTERS.filter(q => q.toLowerCase().includes(formData.quarter.toLowerCase())).slice(0, 5).map(q => (
                            <div key={q} onClick={() => setFormData({ ...formData, quarter: q })} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm">{q}</div>
                        ))}
                    </div>
                )}
            </div>

            <div className="pt-4">
                <button onClick={async () => {
                    await createGatePass(formData)
                    alert("Gate Pass Issued!")
                    onCancel()
                }} className="btn-primary w-full">Issue Gate Pass</button>
            </div>
        </div>
    )
}

export default ElectricalSpecifics
