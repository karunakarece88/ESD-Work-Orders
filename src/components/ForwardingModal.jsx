import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Search, Plus, Minus, Package } from 'lucide-react'
import { ELECTRICAL_MATERIALS } from '../materials'

const ForwardingModal = ({ order, targetSectionName, onCancel, onForward }) => {
    const [step, setStep] = useState('PROMPT') // PROMPT | MATERIALS
    const [usedMaterials, setUsedMaterials] = useState([])
    const [searchQuery, setSearchQuery] = useState('')

    const addMaterial = (matName, itemName, unit) => {
        const fullName = `${matName} - ${itemName}`
        if (!usedMaterials.find(m => m.name === fullName)) {
            setUsedMaterials([...usedMaterials, { name: fullName, quantity: 1, unit: unit || 'Nos' }])
        }
    }

    const handleInitialResponse = (used) => {
        if (used) {
            setStep('MATERIALS')
        } else {
            onForward([])
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-esd-dark/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-esd-dark">Forward Work Order</h3>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    {step === 'PROMPT' ? (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package size={32} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-esd-dark mb-2">Material Usage Check</h4>
                                <p className="text-slate-500">
                                    Did you use any material for this work order before forwarding to <span className="text-primary font-bold">{targetSectionName}</span>?
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleInitialResponse(false)}
                                    className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-100 font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    No
                                </button>
                                <button
                                    onClick={() => handleInitialResponse(true)}
                                    className="flex-1 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all"
                                >
                                    Yes
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search materials used..."
                                    className="input-field pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {ELECTRICAL_MATERIALS.map(cat => (
                                    <div key={cat.id}>
                                        {cat.items.filter(i => `${cat.name} ${i}`.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                                            <div
                                                key={item}
                                                onClick={() => addMaterial(cat.name, item, cat.unit)}
                                                className="px-4 py-3 bg-slate-50 rounded-xl mb-1 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                            >
                                                <span className="text-sm font-medium">{cat.name} - {item}</span>
                                                <Plus size={16} className="text-primary" />
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {usedMaterials.length > 0 && (
                                <div className="space-y-2 pt-4 border-t border-slate-100">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Added Items</h5>
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                        {usedMaterials.map((mat, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold">{mat.name}</span>
                                                    <span className="text-[9px] text-primary font-bold">{mat.unit}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => {
                                                        const newMats = [...usedMaterials];
                                                        newMats[idx].quantity = Math.max(0, newMats[idx].quantity - 1);
                                                        setUsedMaterials(newMats.filter(m => m.quantity > 0));
                                                    }} className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-500 shadow-sm">
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="w-6 text-center text-xs font-bold">{mat.quantity}</span>
                                                    <button onClick={() => {
                                                        const newMats = [...usedMaterials];
                                                        newMats[idx].quantity += 1;
                                                        setUsedMaterials(newMats);
                                                    }} className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                disabled={usedMaterials.length === 0}
                                onClick={() => onForward(usedMaterials)}
                                className="btn-primary w-full py-4 tracking-wide text-base disabled:opacity-50"
                            >
                                Submit Material & Forward
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

export default ForwardingModal
