import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, UserPlus, Package, Plus, Minus, Search } from 'lucide-react'
import { TECHNICIANS } from '../constants'
import { ELECTRICAL_MATERIALS } from '../materials'

const CompletionModal = ({ order, onCancel, onComplete }) => {
    const [selectedTechs, setSelectedTechs] = useState([])
    const [usedMaterials, setUsedMaterials] = useState([])
    const [searchQuery, setSearchQuery] = useState('')

    const [customTech, setCustomTech] = useState('')
    const techs = TECHNICIANS[order.section]?.[order.location] || []

    const finalTechs = techs.length > 0 ? selectedTechs : (customTech ? [customTech] : [])

    const toggleTech = (tech) => {
        if (selectedTechs.includes(tech)) {
            setSelectedTechs(selectedTechs.filter(t => t !== tech))
        } else {
            setSelectedTechs([...selectedTechs, tech])
        }
    }

    const addMaterial = (matName, itemName, unit) => {
        const fullName = `${matName} - ${itemName}`
        if (!usedMaterials.find(m => m.name === fullName)) {
            setUsedMaterials([...usedMaterials, { name: fullName, quantity: 1, unit: unit || 'Nos' }])
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-esd-dark/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                    <h3 className="text-xl font-bold text-esd-dark">Complete Work Order</h3>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8 flex-1">
                    {/* Technicians */}
                    <section>
                        <label className="block text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">Select Technicians</label>
                        <div className="flex flex-wrap gap-3">
                            {techs.length > 0 ? (
                                techs.map(tech => (
                                    <button
                                        key={tech}
                                        onClick={() => toggleTech(tech)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${selectedTechs.includes(tech)
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-slate-100 text-slate-500 hover:border-slate-200'
                                            }`}
                                    >
                                        {tech}
                                    </button>
                                ))
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Enter technician name..."
                                    className="input-field"
                                    value={customTech}
                                    onChange={(e) => setCustomTech(e.target.value)}
                                />
                            )}
                        </div>
                    </section>

                    {/* Materials Section */}
                    <section>
                        <label className="block text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">Material Used</label>
                        {order.section === 'electrical' ? (
                            <>
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search electrical materials..."
                                        className="input-field pl-10 underline decoration-primary/20"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {ELECTRICAL_MATERIALS.map(cat => (
                                        <div key={cat.id}>
                                            {cat.items.filter(i => `${cat.name} ${i}`.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                                                <div
                                                    key={item}
                                                    onClick={() => addMaterial(cat.name, item, cat.unit)}
                                                    className="px-4 py-2.5 bg-slate-50 rounded-xl mb-1 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors border border-transparent hover:border-primary/20"
                                                >
                                                    <span className="text-sm font-medium">{cat.name} - {item}</span>
                                                    <Plus size={16} className="text-primary" />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter material name..."
                                        className="input-field flex-1"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && searchQuery.trim()) {
                                                setUsedMaterials([...usedMaterials, { name: searchQuery, quantity: 1, unit: 'Nos' }]);
                                                setSearchQuery('');
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            if (searchQuery.trim()) {
                                                setUsedMaterials([...usedMaterials, { name: searchQuery, quantity: 1, unit: 'Nos' }]);
                                                setSearchQuery('');
                                            }
                                        }}
                                        className="px-4 bg-primary text-white rounded-xl font-bold transition-transform active:scale-95"
                                    >
                                        Add
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 italic">Type material name and press Enter or click Add</p>
                            </div>
                        )}
                    </section>

                    {/* Added Materials List */}
                    {usedMaterials.length > 0 && (
                        <section className="bg-slate-50 p-4 rounded-2xl space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Added Items</h4>
                            <div className="space-y-2">
                                {usedMaterials.map((mat, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold truncate max-w-[200px]">{mat.name}</span>
                                            <span className="text-[10px] text-primary font-bold uppercase">{mat.unit}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => {
                                                const newMats = [...usedMaterials];
                                                newMats[idx].quantity = Math.max(0, newMats[idx].quantity - 1);
                                                setUsedMaterials(newMats.filter(m => m.quantity > 0));
                                            }} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-8 text-center font-bold">{mat.quantity}</span>
                                            <button onClick={() => {
                                                const newMats = [...usedMaterials];
                                                newMats[idx].quantity += 1;
                                                setUsedMaterials(newMats);
                                            }} className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0">
                    <button
                        disabled={finalTechs.length === 0}
                        onClick={() => onComplete({ technicians: finalTechs, materials: usedMaterials })}
                        className="btn-primary w-full py-4 tracking-wide text-base disabled:opacity-50 disabled:translate-y-0"
                    >
                        Mark as Completed
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

export default CompletionModal
