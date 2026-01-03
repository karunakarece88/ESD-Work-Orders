import { useState } from 'react'
import PreviousWorkOrders from './components/PreviousWorkOrders'
import { motion, AnimatePresence } from 'framer-motion'

import { Construction, Zap, Wind, Wrench, Hammer, Send, Layout, ChevronRight, Home, Settings } from 'lucide-react'
import { SECTIONS, DEPARTMENTS, QUARTERS, OUTSIDE_CAMPUS_AREAS } from './constants'
import { submitWorkOrder, subscribeToOrdersByRequester } from './services/orderService'
import AdminDashboard from './components/AdminDashboard'
import { useEffect } from 'react'
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react'

function App() {
  const [view, setView] = useState('landing') // landing, submit, admin
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => localStorage.getItem('esd_user_role') === 'esd')
  const [isRequesterAuthenticated, setIsRequesterAuthenticated] = useState(() => localStorage.getItem('esd_user_role') === 'requester')
  const [userIdentifier, setUserIdentifier] = useState(() => localStorage.getItem('esd_user_email') || '') // Store the mail ID
  const [loginEmail, setLoginEmail] = useState('') // For input field
  const [loginPass, setLoginPass] = useState('') // For input field
  const [showLogin, setShowLogin] = useState(false)
  const [loginRole, setLoginRole] = useState(null) // 'requester', 'esd'
  const [step, setStep] = useState(1)
  const [requesterOrders, setRequesterOrders] = useState([])
  const [showRequesterOrders, setShowRequesterOrders] = useState(false)
  const [selectedRequesterOrder, setSelectedRequesterOrder] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [showPreviousOrders, setShowPreviousOrders] = useState(false)
  const [formData, setFormData] = useState({
    location: '', // lab, outside
    section: '',
    subSection: '',
    department: '',
    quarter: '',
    requirement: ''
  })

  const resetForm = () => {
    setStep(1)
    setFormData({
      location: '',
      section: '',
      subSection: '',
      department: '',
      quarter: '',
      requirement: ''
    })
  }


  const normalizeQuarter = (val) => {
    if (!val) return val;
    // Handle C1, C01, C-01 -> C-1, D5 -> D-5 etc.
    let upper = val.toUpperCase().trim();
    // Regex to find prefix and number
    const match = upper.match(/^([A-Z]+)[-]?0*(\d+)$/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
    return upper;
  };

  const handleLocationSelect = (loc) => {
    setFormData({ ...formData, location: loc })
    setStep(2)
  }

  const handleSectionSelect = (section) => {
    setFormData({ ...formData, section: section })
    setStep(3)
  }

  // Effect to fetch requester orders when logged in
  useEffect(() => {
    if (isRequesterAuthenticated && userIdentifier) {
      const unsubscribe = subscribeToOrdersByRequester(userIdentifier, (orders) => {
        setRequesterOrders(orders);
      });
      return () => unsubscribe();
    } else {
      setRequesterOrders([]);
    }
  }, [isRequesterAuthenticated, userIdentifier]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('landing'); resetForm(); }}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Construction size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight text-esd-dark">ESD <span className="text-primary font-medium">WorkOrder</span></span>
          </div>

          <div className="flex items-center gap-4">
            {(isAdminAuthenticated || isRequesterAuthenticated) ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{isAdminAuthenticated ? 'ESD' : 'Requester'}</span>
                  <span className="text-sm font-medium text-esd-dark">{userIdentifier}</span>
                </div>
                {isAdminAuthenticated && view !== 'admin' && (
                  <button
                    onClick={() => setView('admin')}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105"
                  >
                    Dashboard
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsAdminAuthenticated(false)
                    setIsRequesterAuthenticated(false)
                    setUserIdentifier('')
                    localStorage.removeItem('esd_user_email')
                    localStorage.removeItem('esd_user_role')
                    setView('landing')
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setLoginRole('requester')
                    setLoginEmail('')
                    setLoginPass('')
                    setShowLogin(true)
                  }}
                  className="px-4 py-2 rounded-xl border border-primary/20 hover:bg-primary/5 text-primary text-sm font-bold transition-all"
                >
                  Requester Login
                </button>
                <button
                  onClick={() => {
                    setLoginRole('esd')
                    setLoginEmail('')
                    setLoginPass('')
                    setShowLogin(true)
                  }}
                  className="px-4 py-2 rounded-xl bg-esd-dark hover:bg-esd-dark/90 text-white text-sm font-bold transition-all"
                >
                  ESD Login
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Admin Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-esd-dark/80 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm">
            <h3 className="text-2xl font-bold mb-6 text-esd-dark">
              {loginRole === 'esd' ? 'ESD / Engineer Login' : 'Requester Login'}
            </h3>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Enter Mail ID"
                className="input-field"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoFocus
              />
              <input
                type="password"
                placeholder="Enter Password"
                className="input-field"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (!loginEmail) return alert("Please enter Mail ID")
                    if (loginRole === 'esd' && loginPass === 'esd123') {
                      setUserIdentifier(loginEmail)
                      setIsAdminAuthenticated(true)
                      localStorage.setItem('esd_user_email', loginEmail)
                      localStorage.setItem('esd_user_role', 'esd')
                      setShowLogin(false)
                      setView('admin')
                    } else if (loginRole === 'requester' && loginPass === 'user123') {
                      setUserIdentifier(loginEmail)
                      setIsRequesterAuthenticated(true)
                      localStorage.setItem('esd_user_email', loginEmail)
                      localStorage.setItem('esd_user_role', 'requester')
                      setShowLogin(false)
                      setView('submit')
                    } else {
                      alert("Incorrect Password")
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  if (!loginEmail) return alert("Please enter Mail ID")
                  if (loginRole === 'esd' && loginPass === 'esd123') {
                    setUserIdentifier(loginEmail)
                    setIsAdminAuthenticated(true)
                    localStorage.setItem('esd_user_email', loginEmail)
                    localStorage.setItem('esd_user_role', 'esd')
                    setShowLogin(false)
                    setView('admin')
                  } else if (loginRole === 'requester' && loginPass === 'user123') {
                    setUserIdentifier(loginEmail)
                    setIsRequesterAuthenticated(true)
                    localStorage.setItem('esd_user_email', loginEmail)
                    localStorage.setItem('esd_user_role', 'requester')
                    setShowLogin(false)
                    setView('submit')
                  } else {
                    alert("Incorrect Password")
                  }
                }}
                className="w-full btn-primary py-3"
              >
                Login
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center mt-6">
              {loginRole === 'esd' ? 'Access restricted to ESD personnel' : 'Use your requester access password'}
            </p>
            <button onClick={() => setShowLogin(false)} className="mt-4 w-full text-slate-400 text-sm font-medium">Cancel</button>
          </motion.div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <div className="inline-block p-3 px-8 rounded-full bg-primary/10 text-primary font-bold mb-6 text-base uppercase tracking-wider">
                Engineering Services Division
              </div>
              <h1 className="text-5xl font-extrabold mb-6 text-esd-dark tracking-tight">
                Welcome to <span className="text-primary">ESD</span>
              </h1>
              <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto">
                Submit and track your engineering work orders online. Fast, efficient, and reliable services for the whole campus.
              </p>

              <button
                onClick={() => {
                  if (isRequesterAuthenticated) setView('submit')
                  else {
                    setLoginRole('requester')
                    setShowLogin(true)
                  }
                }}
                className="btn-primary flex items-center gap-3 mx-auto text-lg px-8 py-4 mb-16"
              >
                <Send size={20} />
                Submit Work Order
              </button>

              {/* Requester Work Orders Section */}
              {isRequesterAuthenticated && requesterOrders.length > 0 && (
                <div className="text-left w-full mt-12 bg-white rounded-3xl p-1 shadow-sm border border-slate-100">
                  {!showRequesterOrders ? (
                    <motion.button
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={requesterOrders.some(o => o.status === 'PENDING' || o.status === 'FORWARDED') ? {
                        scale: [1, 1.05, 1],
                        opacity: 1,
                        boxShadow: [
                          "0px 10px 15px -3px rgba(249, 115, 22, 0.3)",
                          "0px 0px 30px 5px rgba(249, 115, 22, 0.6)",
                          "0px 10px 15px -3px rgba(249, 115, 22, 0.3)"
                        ]
                      } : { scale: 1, opacity: 1 }}
                      transition={requesterOrders.some(o => o.status === 'PENDING' || o.status === 'FORWARDED') ? {
                        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                        boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                        opacity: { duration: 0.5 }
                      } : {}}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setShowRequesterOrders(true)}
                      className={`w-full py-8 rounded-2xl ${requesterOrders.some(o => o.status === 'PENDING' || o.status === 'FORWARDED') ? 'bg-orange-50 border-2 border-orange-200 text-orange-900' : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'} flex flex-col items-center justify-center gap-3 group relative overflow-hidden shadow-xl`}
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-500 rounded-2xl"></div>
                      <div className="relative flex items-center gap-3">
                        {requesterOrders.some(o => o.status === 'PENDING' || o.status === 'FORWARDED') ? (
                          <AlertCircle size={32} className="animate-bounce" />
                        ) : (
                          <CheckCircle2 size={32} />
                        )}
                        <h2 className="text-2xl font-black tracking-tight uppercase">
                          {requesterOrders.some(o => o.status === 'PENDING' || o.status === 'FORWARDED') ? 'Update on Work Order' : 'Work Order Completed'}
                        </h2>
                      </div>
                      <p className="relative font-medium opacity-90 px-4 text-center">
                        {requesterOrders.some(o => o.status === 'FORWARDED')
                          ? "Your Work Order has been forwarded to another section. It will be resolved soon."
                          : requesterOrders.some(o => o.status === 'PENDING')
                            ? "Update on Work Order - Click here to know status"
                            : "All work orders resolved successfully. Click to view details."}
                      </p>
                      {requesterOrders.some(o => o.status === 'PENDING' || o.status === 'FORWARDED') && (
                        <span className="absolute top-4 right-4 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                        </span>
                      )}
                    </motion.button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-6"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-esd-dark">Your Work Orders</h2>
                        <button
                          onClick={() => setShowRequesterOrders(false)}
                          className="text-xs font-bold text-slate-400 hover:text-esd-dark uppercase tracking-wider"
                        >
                          Hide List
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {requesterOrders.map((order) => (
                          <div
                            key={order.id}
                            onClick={() => setSelectedRequesterOrder(order)}
                            className="glass-card p-6 rounded-2xl border-2 border-transparent hover:border-primary transition-all cursor-pointer flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-600 group-hover:bg-green-200' : 'bg-orange-100 text-orange-600 group-hover:bg-orange-200'}`}>
                                {order.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                              </div>
                              <div>
                                <h4 className="font-bold text-esd-dark">{order.department || order.quarter}</h4>
                                <p className="text-sm text-slate-500 truncate max-w-[200px] sm:max-w-md">{order.requirement}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                {order.status === 'FORWARDED'
                                  ? `Forwarded to ${SECTIONS.find(s => s.id === order.section)?.name || order.section}`
                                  : order.status}
                              </span>
                              <p className="text-[10px] text-slate-400 mt-1">{new Date(order.submittedAt?.seconds * 1000).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Requester Order Detail Modal */}
          {selectedRequesterOrder && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-esd-dark/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-esd-dark">Work Order Status</h3>
                  <button onClick={() => setSelectedRequesterOrder(null)} className="p-2 hover:bg-slate-100 rounded-full">
                    <Settings size={20} className="text-slate-400 rotate-90" />
                  </button>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Location / Details</p>
                      <h4 className="font-bold text-lg">{selectedRequesterOrder.department || selectedRequesterOrder.quarter}</h4>
                      <p className="text-sm text-slate-500">{selectedRequesterOrder.location.toUpperCase()} - {selectedRequesterOrder.section.toUpperCase()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedRequesterOrder.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {selectedRequesterOrder.status}
                    </span>
                  </div>

                  {selectedRequesterOrder.status === 'FORWARDED' && (
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm font-medium">
                      Your work order forwarded from <b>{SECTIONS.find(s => s.id === selectedRequesterOrder.previousSection)?.name || selectedRequesterOrder.previousSection || "another"}</b> to <b>{SECTIONS.find(s => s.id === selectedRequesterOrder.section)?.name || selectedRequesterOrder.section}</b> section. It will be resolved soon.
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Requirement</p>
                    <p className="text-sm text-esd-dark leading-relaxed font-medium bg-slate-50 p-4 rounded-xl">{selectedRequesterOrder.requirement}</p>
                  </div>

                  {selectedRequesterOrder.status === 'COMPLETED' && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Completion Details</p>
                        <div className="bg-green-50/50 p-4 rounded-xl space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500 text-xs">Completed On</span>
                            <span className="font-bold">{new Date(selectedRequesterOrder.completedAt?.seconds * 1000).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500 text-xs">Completed By</span>
                            <span className="font-bold">{selectedRequesterOrder.technicians?.join(', ') || 'Staff'}</span>
                          </div>
                          {selectedRequesterOrder.materials?.length > 0 && (
                            <div className="pt-2 border-t border-green-100">
                              <span className="text-slate-500 text-[10px] uppercase font-bold block mb-2">Materials Used</span>
                              <div className="flex flex-wrap gap-2">
                                {selectedRequesterOrder.materials.map((m, i) => (
                                  <span key={i} className="text-[10px] bg-white px-2 py-1 rounded-md border border-green-100 font-bold">
                                    {m.name} ({m.quantity} {m.unit || 'Nos'})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedRequesterOrder(null)}
                    className="w-full btn-primary py-3 mt-4"
                  >
                    Close Status
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {view === 'submit' && (
            <motion.div
              key="submit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-4 sm:p-8 rounded-3xl"
            >
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => { setView('landing'); resetForm(); }} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400">
                  <Home size={20} />
                </button>
                <div className="h-4 w-[1px] bg-slate-200"></div>
                <h2 className="text-2xl font-bold text-esd-dark">Submit Work Order</h2>
                {step > 1 && (
                  <button
                    onClick={() => {
                      if (step === 2) setFormData({ ...formData, location: '' });
                      if (step === 3) setFormData({ ...formData, section: '', subSection: '' });
                      if (step === 4) setFormData({ ...formData, department: '', quarter: '' });
                      setStep(step - 1);
                    }}
                    className="ml-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                  >
                    Back
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full mb-12 overflow-hidden flex">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${(step / 4) * 100}%` }}
                ></div>
              </div>

              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-semibold mb-6">Where is the work needed?</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div onClick={() => handleLocationSelect('lab')} className="section-card">
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                        <Layout size={32} />
                      </div>
                      <span className="text-lg font-bold">LAB</span>
                      <p className="text-sm text-slate-400 mt-2">Inside Office Area</p>
                    </div>
                    <div onClick={() => handleLocationSelect('outside')} className="section-card">
                      <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-4">
                        <Home size={32} />
                      </div>
                      <span className="text-lg font-bold">Staff Quarters &</span>
                      <p className="text-xs font-black text-orange-700 mt-1 uppercase tracking-tighter">Outside Campus Area</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-semibold mb-6">Select Section</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {SECTIONS.filter(s => formData.location === 'lab' || !s.labOnly).map((section) => {
                      const Icon = { Construction, Zap, Wind, Wrench, Hammer }[section.icon]
                      return (
                        <div
                          key={section.id}
                          onClick={() => handleSectionSelect(section.id)}
                          className={`section-card ${formData.section === section.id ? 'border-primary bg-primary/5' : ''}`}
                        >
                          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-3">
                            <Icon size={24} />
                          </div>
                          <span className="text-sm font-bold text-center">{section.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-semibold mb-6">Specific Details</h3>

                  {formData.section === 'civil' && (
                    <div className="space-y-4 mb-8">
                      <label className="block text-sm font-medium text-slate-500 mb-2">Sub-section (Optional)</label>
                      <div className="grid grid-cols-3 gap-4">
                        {['Mason', 'Carpentry', 'Plumbing'].map(sub => (
                          <div
                            key={sub}
                            onClick={() => setFormData({ ...formData, subSection: sub })}
                            className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all ${formData.subSection === sub ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 hover:border-slate-200'}`}
                          >
                            <span className="text-sm font-bold">{sub}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-500 mb-2">
                      {formData.location === 'lab' ? 'Select Department' : 'Select Quarter / Area'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        autoComplete="off"
                        placeholder="Search or type..."
                        className="input-field"
                        value={formData.location === 'lab' ? formData.department : formData.quarter}
                        onChange={(e) => {
                          let val = e.target.value
                          if (formData.location === 'lab') {
                            setFormData({ ...formData, department: val })
                          } else {
                            // Normalization Logic: Auto-insert hyphen for C1 -> C-1 pattern
                            val = val.toUpperCase();
                            // Regex to match things like "C1", "D05" and insert hyphen
                            if (/^[A-Z][0-9]/.test(val) && !val.includes('-')) {
                              val = val.slice(0, 1) + '-' + val.slice(1);
                            }
                            // Handle "C01" -> "C-01" -> "C-1" if needed, but per request just auto-hyphen is key.
                            // Let's refine: "C1" -> "C-1", "D05" -> "D-5" (remove leading zero after hyphen)
                            if (/^[A-Z]-[0-9]/.test(val)) {
                              const parts = val.split('-');
                              if (parts[1].startsWith('0') && parts[1].length > 1) {
                                parts[1] = parts[1].slice(1);
                                val = parts.join('-');
                              }
                            }
                            setFormData({ ...formData, quarter: val })
                          }
                        }}
                      />
                      <div className="mt-2 max-h-40 overflow-y-auto border border-slate-100 rounded-xl bg-white shadow-sm">
                        {(() => {
                          const inputVal = (formData.location === 'lab' ? formData.department : formData.quarter).toLowerCase();
                          const items = [...new Set(formData.location === 'lab' ? DEPARTMENTS : [...OUTSIDE_CAMPUS_AREAS, ...QUARTERS])];
                          const filtered = items.filter(item => {
                            if (!inputVal) return false;
                            const normalizedItem = item.toLowerCase();
                            // Direct match or partial match
                            // For quarters, prioritized "starts with"
                            if (formData.location !== 'lab') {
                              // If typing 'c', show all starting with c
                              return normalizedItem.startsWith(inputVal.toLowerCase()) || normalizedItem.includes(inputVal.toLowerCase());
                            }
                            return normalizedItem.includes(inputVal.toLowerCase());
                          });
                          return filtered.slice(0, 20).map(item => (
                            <div
                              key={item}
                              onClick={() => {
                                if (formData.location === 'lab') setFormData({ ...formData, department: item })
                                else setFormData({ ...formData, quarter: item })
                              }}
                              className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                            >
                              {item}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={() => setStep(4)}
                      disabled={!(formData.location === 'lab' ? formData.department : formData.quarter)}
                      className="btn-primary disabled:opacity-50 disabled:translate-y-0"
                    >
                      Next Step
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl font-semibold mb-6">Your Requirement</h3>
                  <textarea
                    rows="5"
                    placeholder="Describe what needs to be fixed or installed..."
                    className="input-field resize-none"
                    value={formData.requirement}
                    onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                  ></textarea>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={async () => {
                        try {
                          await submitWorkOrder({
                            ...formData,
                            requesterEmail: userIdentifier
                          })
                          alert(`Your work order submitted and forwarded to respective section`)
                          resetForm();
                        } catch (e) {
                          alert(e.message)
                        }
                      }}
                      disabled={!formData.requirement}
                      className="btn-primary flex items-center gap-2 px-10"
                    >
                      <Send size={18} />
                      Final Submit
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Add more steps here... */}
              <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between">
                <div></div>
              </div>
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <AdminDashboard hideCreation={true} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      {/* Previous Work Orders Modal */}
      {showPreviousOrders && (
        <PreviousWorkOrders
          orders={requesterOrders}
          onClose={() => setShowPreviousOrders(false)}
        />
      )}
    </div>
  )
}

export default App
