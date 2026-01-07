import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Send, X, ChevronRight } from 'lucide-react'
import { createGatePass } from '../services/orderService'
import { QUARTERS } from '../constants'

const ElectricalSpecifics = () => {
    const [activeSubTab, setActiveSubTab] = useState('GATEPASS')
    const [showForm, setShowForm] = useState(null) // 'gatepass'

    return (
        <div className="space-y-6">
            <div className="flex gap-4 border-b border-slate-100 pb-4">
                {['GATEPASS'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        className={`text-sm font-bold transition-colors ${activeSubTab === tab ? 'text-primary' : 'text-slate-400 hover:text-slate-500'}`}
                    >
                        {tab === 'GATEPASS' ? 'GATE PASS' : tab}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
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
                            <h3 className="text-xl font-bold">New Gate Pass</h3>
                            <button onClick={() => setShowForm(null)}><X size={20} /></button>
                        </div>

                        <GatePassForm onCancel={() => setShowForm(null)} />
                    </motion.div>
                </div>
            )}
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
