import { useState, useEffect } from 'react'
import PreviousWorkOrders from './components/PreviousWorkOrders'
import { motion, AnimatePresence } from 'framer-motion'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth, storage } from './firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

import { Construction, Zap, Wind, Wrench, Hammer, FileText, Send, Layout, ChevronRight, Home, Settings, ChevronDown, Camera, Image, Trash2, Loader2, Paperclip, Search, X, Microscope } from 'lucide-react'
import { SECTIONS, DEPARTMENTS, QUARTERS, OUTSIDE_CAMPUS_AREAS, SECTION_PASSWORDS, BUILDING_NAMES } from './constants'
import { submitWorkOrder, subscribeToOrdersByRequester, searchWorkOrders } from './services/orderService'
import AdminDashboard from './components/AdminDashboard'
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import WorkOrderDetailModal from './components/WorkOrderDetailModal'

function App() {
  const [view, setView] = useState('landing') // landing, submit, admin
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [isHodAuthenticated, setIsHodAuthenticated] = useState(false)
  const [isRequesterAuthenticated, setIsRequesterAuthenticated] = useState(false)
  const [userIdentifier, setUserIdentifier] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginName, setLoginName] = useState('')
  const [loginPhone, setLoginPhone] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [loginRole, setLoginRole] = useState(null) // 'requester', 'esd'

  // Auth State
  const [isSignUp, setIsSignUp] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [requesterName, setRequesterName] = useState('')

  const [step, setStep] = useState(1)
  const [requesterOrders, setRequesterOrders] = useState([])
  const [showRequesterOrders, setShowRequesterOrders] = useState(false)
  const [selectedRequesterOrder, setSelectedRequesterOrder] = useState(null)
  const [selectedSection, setSelectedSection] = useState(null)
  const [showPreviousOrders, setShowPreviousOrders] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showBuildingDropdown, setShowBuildingDropdown] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showStatusSearch, setShowStatusSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [formData, setFormData] = useState({
    location: '', // lab, outside
    section: '',
    subSection: '',
    department: '',
    building: '',
    roomNo: '',
    quarter: '',
    requirement: '',
    attachmentUrl: ''
  })

  const resetForm = () => {
    setStep(1)
    setFormData({
      location: '',
      section: '',
      subSection: '',
      department: '',
      building: '',
      roomNo: '',
      quarter: '',
      requirement: '',
      attachmentUrl: ''
    })
    setShowDropdown(false)
    setShowBuildingDropdown(false)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size too large. Please select an image under 5MB.");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `workOrders/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, attachmentUrl: url }));
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload image. Please check your storage rules.");
    } finally {
      setUploading(false);
    }
  };


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

  // Handle Login/Signup
  const handleAuthAction = async () => {
    if (loginRole === 'requester') {
      if (!loginName || !loginPhone) {
        setAuthError('Please enter both Name and Mobile Number');
        return;
      }
      if (loginPhone.length !== 10) {
        setAuthError('check mobile number it should be 10 digit number');
        return;
      }
      setRequesterName(loginName);
      setUserIdentifier(loginPhone);
      setIsRequesterAuthenticated(true);
      setView('submit');
      setShowLogin(false);
      setLoginName('');
      setLoginPhone('');
      return;
    }

    if (!loginPass) {
      setAuthError('Please enter password');
      return;
    }

    if (loginPass === SECTION_PASSWORDS.main_esd) {
      setIsAdminAuthenticated(true);
      setView('admin');
      setShowLogin(false);
      setLoginPass('');
      setAuthError('');
      localStorage.setItem('esd_staff_session', 'true');
    } else if (loginPass === SECTION_PASSWORDS.hod) {
      setIsAdminAuthenticated(true);
      setIsHodAuthenticated(true);
      setView('admin');
      setShowLogin(false);
      setLoginPass('');
      setAuthError('');
      localStorage.setItem('esd_staff_session', 'true');
      localStorage.setItem('esd_hod_session', 'true');
    } else {
      setAuthError('Invalid password');
    }
    setAuthLoading(false);
  };

  // Listen to Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserIdentifier(user.email);
        const lastRole = localStorage.getItem('esd_last_role');
        if (lastRole === 'esd') setIsAdminAuthenticated(true);
      } else {
        // Check for local staff session
        const staffSession = localStorage.getItem('esd_staff_session');
        const hodSession = localStorage.getItem('esd_hod_session');
        if (staffSession) {
          setIsAdminAuthenticated(true);
          if (hodSession) setIsHodAuthenticated(true);
        }

        // If not firebase user, check for local requester session
        const storedPhone = localStorage.getItem('esd_requester_phone');
        const storedName = localStorage.getItem('esd_requester_name');
        if (storedPhone && storedName) {
          setUserIdentifier(storedPhone);
          setRequesterName(storedName);
          setIsRequesterAuthenticated(true);
        } else {
          setIsAdminAuthenticated(false);
          setIsRequesterAuthenticated(false);
          setUserIdentifier('');
          setRequesterName('');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Role to LocalStorage for persistence check inside Auth listener
  useEffect(() => {
    if (isAdminAuthenticated) {
      localStorage.setItem('esd_last_role', 'esd');
      localStorage.setItem('esd_staff_session', 'true');
    }
    else if (isRequesterAuthenticated) {
      localStorage.setItem('esd_last_role', 'requester');
      localStorage.setItem('esd_requester_phone', userIdentifier);
      localStorage.setItem('esd_requester_name', requesterName);
    }
    else {
      localStorage.removeItem('esd_last_role');
      localStorage.removeItem('esd_requester_phone');
      localStorage.removeItem('esd_requester_name');
      localStorage.removeItem('esd_staff_session');
      localStorage.removeItem('esd_hod_session');
    }
  }, [isAdminAuthenticated, isRequesterAuthenticated, userIdentifier, requesterName, isHodAuthenticated]);

  const handleLocationSelect = (loc) => {
    setFormData({ ...formData, location: loc })
    setStep(2)
  }

  const handleSectionSelect = (section) => {
    setFormData({ ...formData, section: section })
    setStep(3)
  }

  const handleLogout = async () => {
    await signOut(auth);
    setIsAdminAuthenticated(false);
    setIsHodAuthenticated(false);
    setIsRequesterAuthenticated(false);
    setUserIdentifier('');
    setRequesterName('');
    localStorage.removeItem('esd_requester_phone');
    localStorage.removeItem('esd_requester_name');
    localStorage.removeItem('esd_hod_session');
    setView('landing');
  };

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

  useEffect(() => {
    if (showStatusSearch && searchQuery.length >= 1) {
      setIsSearching(true);
      const unsub = searchWorkOrders(searchQuery, (results) => {
        setSearchResults(results);
        setIsSearching(false);
      });
      return () => unsub?.();
    } else {
      setSearchResults([]);
    }
  }, [showStatusSearch, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {!(isAdminAuthenticated || isRequesterAuthenticated) && (
            <button
              onClick={() => {
                setLoginRole('requester')
                setLoginName('')
                setLoginPhone('')
                setIsSignUp(false)
                setAuthLoading(false)
                setShowLogin(true)
              }}
              className="px-6 py-3 rounded-xl bg-primary text-white text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              Requester Login
            </button>
          )}

          <div className="flex items-center gap-4 ml-auto">
            {isAdminAuthenticated && !isHodAuthenticated && (
              <button
                onClick={() => {
                  setLoginRole('hod')
                  setLoginPass('')
                  setShowLogin(true)
                }}
                className="px-4 py-2 rounded-xl bg-blue-900/10 text-blue-900 text-sm font-bold transition-all hover:bg-blue-900/20"
              >
                HOD Login
              </button>
            )}
            {(isAdminAuthenticated || isRequesterAuthenticated) ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    {isHodAuthenticated ? 'HOD' : (isAdminAuthenticated ? 'ESD' : 'Requester')}
                  </span>
                  <span className="text-sm font-medium text-esd-dark">{isHodAuthenticated ? 'Reviewer' : (requesterName || userIdentifier)}</span>
                  {requesterName && <span className="text-[9px] text-slate-400 font-bold">{userIdentifier}</span>}
                </div>
                {isAdminAuthenticated && view !== 'admin' && (
                  <button
                    onClick={() => setView('admin')}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105"
                  >
                    Dashboard
                  </button>
                )}
                {isRequesterAuthenticated && (
                  <button
                    onClick={() => {
                      setView('landing');
                      setShowRequesterOrders(true);
                    }}
                    className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 text-xs font-black uppercase tracking-widest hover:bg-orange-100 transition-all active:scale-95"
                  >
                    <Clock size={16} />
                    Your previous Work Orders
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setLoginRole('esd')
                  setLoginEmail('')
                  setLoginPass('')
                  setIsSignUp(false)
                  setAuthLoading(false)
                  setShowLogin(true)
                }}
                className="px-6 py-3 rounded-xl bg-primary text-white text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                ESD Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Login / Signup Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-esd-dark/80 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm">
            <h3 className="text-2xl font-bold mb-6 text-esd-dark">
              {loginRole === 'hod' ? 'HOD Login' : (loginRole === 'esd' ? 'ESD / Engineer Login' : 'Requester Login')}
            </h3>

            {authError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
                {authError}
              </div>
            )}

            <div className="space-y-4">
              {loginRole === 'requester' ? (
                <>
                  <input
                    type="tel"
                    placeholder="Enter Mobile Number"
                    className={`input-field text-lg ${loginPhone.length > 10 ? 'border-red-500' : ''}`}
                    value={loginPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length > 10) {
                        setAuthError('check mobile number it should be 10 digit number');
                      } else {
                        if (authError === 'check mobile number it should be 10 digit number') setAuthError('');
                        setLoginPhone(val);
                      }
                    }}
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Enter Your Name"
                    className="input-field text-lg"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAuthAction();
                    }}
                  />
                </>
              ) : (
                <>
                  <input
                    type="password"
                    placeholder={loginRole === 'hod' ? "Enter HOD Password" : "Enter ESD Password"}
                    className="input-field text-lg"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAuthAction();
                    }}
                  />
                </>
              )}
              <button
                onClick={handleAuthAction}
                disabled={authLoading}
                className="w-full btn-primary py-4 flex items-center justify-center gap-2 text-lg active:scale-95 transition-transform"
              >
                {authLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Login
              </button>
            </div>

            <button onClick={() => setShowLogin(false)} className="mt-4 w-full text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors uppercase tracking-widest cursor-pointer">Cancel</button>
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
              <div className="mb-4">
                <motion.h2
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-3xl md:text-5xl font-black text-blue-900 uppercase tracking-wide mb-2"
                >
                  CSIR-IICT
                </motion.h2>
                <div className="h-1 w-24 bg-gold-gradient mx-auto rounded-full mb-6"></div>
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold mb-6 text-blue-900 tracking-tight leading-tight">
                Engineering Services Division <br />
                <span>(ESD)</span>
              </h1>

              <p className="text-xl md:text-2xl text-blue-900 mb-12 max-w-2xl mx-auto font-medium">
                Submit and track your work order Status on online
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <button
                  onClick={() => {
                    if (isRequesterAuthenticated) setView('submit')
                    else {
                      setLoginRole('requester')
                      setIsSignUp(false)
                      setShowLogin(true)
                    }
                  }}
                  className="btn-primary flex items-center gap-3 text-lg px-8 py-4 w-full sm:w-auto"
                >
                  <Send size={20} />
                  Submit New Work Order
                </button>

                <button
                  onClick={() => setShowStatusSearch(true)}
                  className="btn-primary flex items-center justify-center gap-3 text-lg px-8 py-4 w-full sm:w-auto"
                >
                  <Search size={20} />
                  Status of Work Order
                </button>
              </div>


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
                        <h2 className="text-xl md:text-2xl font-black tracking-tight flex flex-wrap items-center justify-center gap-x-2 text-center px-4">
                          {requesterOrders.some(o => o.status === 'PENDING' || o.status === 'FORWARDED') ? (
                            <>
                              <span className="flex flex-col items-center">
                                <span>Your work order is in pending state</span>
                                {requesterOrders.filter(o => o.status === 'FORWARDED').map((o, idx) => (
                                  <span key={idx} className="text-[10px] font-bold text-orange-600 bg-white/50 px-2 py-0.5 rounded-lg mt-1 border border-orange-200 decoration-dotted">
                                    Forwarded from {SECTIONS.find(s => s.id === o.previousSection)?.name || o.previousSection} to {SECTIONS.find(s => s.id === o.section)?.name || o.section} section
                                  </span>
                                ))}
                              </span>
                              <span className="text-sm bg-black/10 px-2 py-0.5 rounded-lg opacity-80">(View status)</span>
                            </>
                          ) : (
                            <>
                              <span>Completed</span>
                              <span className="text-sm bg-black/10 px-2 py-0.5 rounded-lg opacity-80">(View status)</span>
                            </>
                          )}
                        </h2>
                      </div>
                      {requesterOrders.some(o => o.status === 'PENDING' || o.status === 'FORWARDED') && (
                        <span className="absolute top-4 right-4 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></span>
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
                                  ? `Forwarded from ${SECTIONS.find(s => s.id === order.previousSection)?.name || order.previousSection} to ${SECTIONS.find(s => s.id === order.section)?.name || order.section}`
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
            <WorkOrderDetailModal
              order={selectedRequesterOrder}
              onClose={() => setSelectedRequesterOrder(null)}
            />
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
                <h2 className="text-sm sm:text-lg font-bold text-esd-dark flex-1 leading-tight">
                  {step < 3 ? "Submit Work Order" : (
                    <>
                      You are submitting <span className="text-primary">{SECTIONS.find(s => s.id === formData.section)?.name}</span> work order
                      <span className="text-slate-400"> ({formData.location === 'lab' ? 'LAB (In campus)' : 'Staff Quarters & Out Campus'})</span>
                    </>
                  )}
                </h2>
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
                      <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-4">
                        <Layout size={32} />
                      </div>
                      <div className="text-center text-blue-900">
                        <span className="text-lg font-bold">LAB (In campus)</span>
                      </div>
                    </div>
                    <div onClick={() => handleLocationSelect('outside')} className="section-card">
                      <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-4">
                        <Home size={32} />
                      </div>
                      <div className="text-center text-blue-900">
                        <span className="text-lg font-bold">Staff Quarters & Out Campus</span>
                      </div>
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
                    {SECTIONS.filter(s => s.id !== 'hod' && (formData.location === 'lab' || !s.labOnly)).map((section) => {
                      const Icon = { Construction, Zap, Wind, Wrench, Hammer, FileText, Microscope }[section.icon]
                      return (
                        <div
                          key={section.id}
                          onClick={() => handleSectionSelect(section.id)}
                          className={`section-card ${formData.section === section.id ? 'bg-primary/10 scale-105 shadow-xl transition-all' : ''}`}
                        >
                          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-3">
                            <Icon size={24} />
                          </div>
                          <span className="text-base font-black text-blue-900 text-center uppercase tracking-tighter leading-tight">{section.name}</span>
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


                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-500 mb-2">
                      {formData.location === 'lab' ? 'Select Department' : 'Select Quarter / Area'}
                    </label>
                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="Search or type..."
                          className={`input-field pr-12 transition-all ${(() => {
                            const val = formData.location === 'lab' ? formData.department : formData.quarter;
                            const items = formData.location === 'lab' ? DEPARTMENTS : [...OUTSIDE_CAMPUS_AREAS, ...QUARTERS];
                            return val && !items.includes(val) ? 'border-red-500 focus:ring-red-200 bg-red-50/10' : '';
                          })()}`}
                          value={formData.location === 'lab' ? formData.department : formData.quarter}
                          onFocus={() => {
                            setShowDropdown(true)
                            setShowBuildingDropdown(false)
                          }}
                          onChange={(e) => {
                            let val = e.target.value
                            setShowDropdown(true)
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
                        <button
                          type="button"
                          onClick={() => setShowDropdown(!showDropdown)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                        >
                          <ChevronDown size={20} className={`transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {showDropdown && (
                        <div className="absolute z-20 mt-2 w-full max-h-60 overflow-y-auto border border-slate-100 rounded-2xl bg-white shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          {(() => {
                            const inputVal = (formData.location === 'lab' ? formData.department : formData.quarter).toLowerCase();
                            const items = [...new Set(formData.location === 'lab' ? DEPARTMENTS : [...OUTSIDE_CAMPUS_AREAS, ...QUARTERS])];
                            const filtered = items.filter(item => {
                              if (!inputVal) return true; // Show all if input is empty
                              const normalizedItem = item.toLowerCase();
                              return normalizedItem.includes(inputVal);
                            });

                            if (filtered.length === 0) {
                              return <div className="px-4 py-3 text-sm text-slate-400 italic">No matching options found. Type to add custom...</div>;
                            }

                            return filtered.slice(0, 50).map(item => (
                              <div
                                key={item}
                                onClick={() => {
                                  if (formData.location === 'lab') setFormData({ ...formData, department: item })
                                  else setFormData({ ...formData, quarter: item })
                                  setShowDropdown(false)
                                }}
                                className="px-4 py-2.5 hover:bg-primary/5 hover:text-primary cursor-pointer text-sm font-medium transition-colors"
                              >
                                {item}
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Building & Room No - Lab Specific */}
                  {formData.location === 'lab' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-4 border-t border-slate-50"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Building Name */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-500">Building Name / Section Name</label>
                          <div className="relative">
                            <input
                              type="text"
                              autoComplete="off"
                              placeholder="Search or type building..."
                              className="input-field"
                              value={formData.building}
                              onFocus={() => {
                                setShowBuildingDropdown(true)
                                setShowDropdown(false)
                              }}
                              onChange={(e) => {
                                setFormData({ ...formData, building: e.target.value });
                                setShowBuildingDropdown(true);
                              }}
                            />
                            {showBuildingDropdown && (
                              <div className="absolute z-10 mt-2 w-full max-h-48 overflow-y-auto border border-slate-100 rounded-2xl bg-white shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                {(() => {
                                  const inputVal = formData.building.toLowerCase();
                                  const filtered = BUILDING_NAMES.filter(b => b.toLowerCase().includes(inputVal));

                                  if (filtered.length === 0) {
                                    return <div className="px-4 py-2 text-xs text-slate-400 italic">Type to add custom building...</div>
                                  }

                                  return filtered.map(b => (
                                    <div
                                      key={b}
                                      onClick={() => {
                                        setFormData({ ...formData, building: b });
                                        setShowBuildingDropdown(false);
                                      }}
                                      className="px-4 py-2 hover:bg-primary/5 hover:text-primary cursor-pointer text-sm transition-colors"
                                    >
                                      {b}
                                    </div>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Room No */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-500">Room No / Floor</label>
                          <input
                            type="text"
                            placeholder="e.g. 101 or 1st Floor"
                            className="input-field"
                            value={formData.roomNo}
                            onChange={(e) => setFormData({ ...formData, roomNo: e.target.value })}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="mt-8 flex flex-col items-end gap-2">
                    {(() => {
                      const val = formData.location === 'lab' ? formData.department : formData.quarter;
                      const items = formData.location === 'lab' ? DEPARTMENTS : [...OUTSIDE_CAMPUS_AREAS, ...QUARTERS];
                      const isValid = items.includes(val);

                      // Lab specific check: Department must be valid AND Building must be specified
                      const canProceed = formData.location === 'lab'
                        ? (isValid && formData.building.trim().length > 0)
                        : isValid;

                      return (
                        <>
                          {!isValid && val && (
                            <span className="text-[10px] font-bold text-red-500 animate-pulse">
                              Please select a valid {formData.location === 'lab' ? 'department' : 'quarter'} from the list
                            </span>
                          )}
                          {formData.location === 'lab' && isValid && !formData.building.trim() && (
                            <span className="text-[10px] font-bold text-orange-500">
                              Please specify the Building Name
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setShowDropdown(false);
                              setShowBuildingDropdown(false);
                              setStep(4);
                            }}
                            disabled={!canProceed}
                            className="btn-primary disabled:opacity-50 disabled:translate-y-0"
                          >
                            Next Step
                          </button>
                        </>
                      );
                    })()}
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
                    className="input-field resize-none mb-4"
                    value={formData.requirement}
                    onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                  ></textarea>

                  <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="flex flex-col items-center text-center">
                      {!formData.attachmentUrl ? (
                        <>
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-sm mb-3">
                            {uploading ? <Loader2 size={24} className="animate-spin text-primary" /> : <Camera size={24} />}
                          </div>
                          <p className="text-sm font-bold text-esd-dark mb-1">Add Photo (Optional)</p>
                          <p className="text-[10px] text-slate-400 mb-4 px-10">Supporting images help technicians resolve the issue faster.</p>

                          <div className="flex gap-3 w-full">
                            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                              <Camera size={16} />
                              Take Photo
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                            </label>
                            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all shadow-sm">
                              <Image size={16} />
                              Upload
                              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                            </label>
                          </div>
                        </>
                      ) : (
                        <div className="w-full">
                          <div className="relative group">
                            <img src={formData.attachmentUrl} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData(prev => ({ ...prev, attachmentUrl: '' }));
                              }}
                              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all z-10"
                              title="Remove Photo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p className="text-xs font-bold text-green-600 mt-2 flex items-center justify-center gap-1">
                            <Paperclip size={12} /> Image attached successfully
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={async () => {
                        try {
                          await submitWorkOrder({
                            ...formData,
                            requesterEmail: userIdentifier.includes('@') ? userIdentifier : '',
                            requesterPhone: !userIdentifier.includes('@') ? userIdentifier : '',
                            requesterName: requesterName || ''
                          })
                          setShowSuccess(true);
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
              <AdminDashboard isHodAuthenticated={isHodAuthenticated} hideCreation={true} />
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
      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-esd-dark/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl overflow-hidden relative"
          >
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-2xl font-bold text-esd-dark mb-2">Submission Successful!</h3>
            <p className="text-slate-500 mb-8">
              Your work order submitted to <span className="text-primary font-bold">{SECTIONS.find(s => s.id === formData.section)?.name}</span>
              <span className="text-slate-400 font-medium italic"> ({formData.location === 'lab' ? 'LAB (In campus)' : 'Staff Quarters & Out Campus'})</span>
            </p>
            <button
              onClick={() => {
                setShowSuccess(false);
                handleLogout(); // Log out for security
                window.location.reload(); // Force refresh to ask for login
              }}
              className="w-full btn-primary py-4 text-lg"
            >
              OK
            </button>
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
          </motion.div>
        </div>
      )}

      {/* Status Search Modal */}
      {showStatusSearch && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-esd-dark/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl overflow-hidden relative"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-esd-dark">Status of Work Order</h3>
              <button
                onClick={() => { setShowStatusSearch(false); setSearchQuery(''); }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by Mobile, Department or Quarter..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-primary transition-all outline-none font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {isSearching ? (
                <div className="py-12 text-center">
                  <Loader2 className="animate-spin mx-auto text-primary mb-2" size={32} />
                  <p className="text-slate-400 font-medium">Searching...</p>
                </div>
              ) : searchQuery.length < 1 ? (
                <div className="py-12 text-center text-slate-400">
                  <AlertCircle className="mx-auto mb-2 opacity-20" size={48} />
                  <p>Type to search...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <AlertCircle className="mx-auto mb-2 opacity-20" size={48} />
                  <p>No matching work orders found</p>
                </div>
              ) : (
                searchResults.map(order => (
                  <div key={order.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                          {order.section?.toUpperCase()} WORK ORDER
                        </p>
                        <h4 className="font-bold text-esd-dark">{order.department || order.quarter}</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                        order.status === 'FORWARDED' ? 'bg-blue-100 text-blue-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 italic">"{order.requirement}"</p>
                    <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span>{new Date(order.submittedAt?.seconds * 1000).toLocaleDateString()}</span>
                      {order.status === 'FORWARDED' && (
                        <span className="text-blue-500">FORWARDED FROM {order.previousSection?.toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default App
