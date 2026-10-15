import { useState, useRef, useEffect } from 'react'
import { useToast } from './Toast'
import { getInitials } from '../context/UserContext'
import { validateImageFile } from '../lib/imageValidator'
import { validatePasswordStrength, getPasswordRequirements } from '../lib/cryptoUtils'

const departmentOptions = [
  'B.Tech Computer Science & Engineering',
  'B.Tech Artificial Intelligence & Machine Learning',
  'B.Tech Electronics & Communication',
  'B.Tech Mechanical Engineering',
  'B.Tech Civil Engineering',
  'Bachelor of Computer Applications (BCA)',
  'Master of Computer Applications (MCA)',
  'Bachelor of Business Administration (BBA)',
  'Master of Business Administration (MBA)',
  'B.Sc / M.Sc Biotechnology',
  'University Department of Design & Arts',
]

const interestOptions = [
  'AI & Autonomous Agents',
  'Web3 & Distributed Systems',
  'Competitive Coding',
  'Robotics & Embedded Systems',
  'UI/UX & Product Design',
  'Cultural & Musical Society',
  'Inter-Collegiate Sports',
  'Research & Colloquiums',
]

export default function ProfileSetupModal({
  isOpen,
  initialData = {},
  onComplete,
  onSkip,
}) {
  const showToast = useToast()
  const fileInputRef = useRef(null)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    name: initialData.name || '',
    email: initialData.email || '',
    password: initialData.password || '',
    rollNo: initialData.rollNo || '',
    phone: initialData.phone || '',
    branch: initialData.branch || 'B.Tech Computer Science & Engineering',
    sem: initialData.sem || 'SEM 1',
    year: initialData.year || "'28",
    role: initialData.role || 'student',
    avatar: initialData.avatar || null,
    interests: initialData.interests || ['AI & Autonomous Agents', 'Competitive Coding'],
  })

  // Synchronize when initialData changes (e.g. on new signup or Google OAuth redirect)
  useEffect(() => {
    if (!isOpen) return
    if (initialData && (initialData.name || initialData.email)) {
      setFormData((prev) => ({
        ...prev,
        name: initialData.name || prev.name,
        email: initialData.email || prev.email,
        password: initialData.password || prev.password,
        role: initialData.role || prev.role,
        rollNo: initialData.rollNo || prev.rollNo,
        branch: initialData.branch || prev.branch,
        sem: initialData.sem || prev.sem,
        year: initialData.year || prev.year,
        phone: initialData.phone || prev.phone,
        avatar: initialData.avatar || prev.avatar,
      }))
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const check = validateImageFile(file)
      if (!check.valid) {
        showToast(check.error)
        e.target.value = ''
        return
      }
      const reader = new FileReader()
      reader.onload = (uploadEvent) => {
        setFormData((prev) => ({ ...prev, avatar: uploadEvent.target.result }))
        showToast(`Profile photo attached (${check.sizeKb} KB)`)
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleInterest = (interest) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(interest)
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((i) => i !== interest)
          : [...prev.interests, interest],
      }
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showToast('Please provide your full name')
      return
    }

    if (!formData.rollNo.trim()) {
      showToast('Please provide your University Roll Number / Student ID')
      return
    }

    const passCheck = validatePasswordStrength(formData.password)
    if (!passCheck.valid) {
      showToast(passCheck.error)
      return
    }

    onComplete({
      ...formData,
      isProfileSetup: true,
    })
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto p-3 sm:p-6 flex items-start sm:items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto sm:my-8 flex flex-col max-h-[92vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-primary via-indigo-700 to-primary text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-white/80 font-bold block">
                Account Setup • Step 2 of 2
              </span>
              <h2 className="font-headline text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                Complete Your Campus Profile
              </h2>
            </div>
          </div>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-xs font-headline font-semibold text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              Skip
            </button>
          )}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* Avatar & Identity Banner */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/90">
            <div className="relative group shrink-0">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt={formData.name || 'User'}
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary/30 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-md border-2 border-white">
                  <span className="font-headline font-extrabold text-white text-2xl">
                    {getInitials(formData.name || 'Campus Student')}
                  </span>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-primary transition-colors cursor-pointer"
                title="Upload Photo"
              >
                <span className="material-symbols-outlined text-[15px]">photo_camera</span>
              </button>
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
              <h3 className="font-headline text-base font-bold text-slate-900">
                {formData.name || 'New Student'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your campus photo or keep the verified initials avatar.
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-headline font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Choose Picture
                </button>
                {formData.avatar && (
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, avatar: null }))}
                    className="text-xs text-rose-600 hover:underline font-headline font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Role Choice */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-headline font-bold text-slate-700 uppercase tracking-wider">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'student' })}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                  formData.role === 'student'
                    ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">school</span>
                <div className="text-left">
                  <div className="text-xs font-headline">Student</div>
                  <div className="text-[10px] text-slate-500 font-normal">Browse, attend & earn certs</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'host' })}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                  formData.role === 'host'
                    ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">campaign</span>
                <div className="text-left">
                  <div className="text-xs font-headline">Club Organizer / Host</div>
                  <div className="text-[10px] text-slate-500 font-normal">Host events & manage attendees</div>
                </div>
              </button>
            </div>
          </div>

          {/* Academic Identity Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-headline font-bold text-slate-700">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-headline font-bold text-slate-700">
                University Roll No / UID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.rollNo}
                onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="e.g. 24BCS10842"
              />
              <span className="text-[10px] text-slate-400">Printed on your event passes and certificates</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-headline font-bold text-slate-700">University Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="e.g. student@university.edu"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-headline font-bold text-slate-700">Contact Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="e.g. 9876543210"
              />
            </div>
          </div>

          {/* Account Password for Direct Manual Login */}
          <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-headline font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-600">lock</span>
                Account Password <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider bg-indigo-100 px-2 py-0.5 rounded-full">
                For Manual Login
              </span>
            </div>
            <p className="text-[11px] text-indigo-900/70 leading-relaxed">
              Create a secure password so you can sign in with your email or Student ID even without Google.
            </p>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Create strong password (min 8 characters)..."
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 pr-10 text-xs bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {formData.password && (() => {
              const reqs = getPasswordRequirements(formData.password)
              return (
                <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-white border border-indigo-100 text-[10px] mt-1.5 font-mono">
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <span className={reqs.length ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                      {reqs.length ? '✓' : '○'} 8+ characters
                    </span>
                    <span className={reqs.hasUpper ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                      {reqs.hasUpper ? '✓' : '○'} Uppercase (A-Z)
                    </span>
                    <span className={reqs.hasLower ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                      {reqs.hasLower ? '✓' : '○'} Lowercase (a-z)
                    </span>
                    <span className={reqs.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                      {reqs.hasNumber ? '✓' : '○'} Number (0-9)
                    </span>
                    <span className={reqs.hasSpecial ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                      {reqs.hasSpecial ? '✓' : '○'} Symbol (!@#$...)
                    </span>
                    <span className={reqs.notTrivial ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                      {reqs.notTrivial ? '✓ Non-trivial' : '✗ No simple 123...'}
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Branch / Department */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-headline font-bold text-slate-700">
              Department / Branch
            </label>
            <select
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
            >
              {departmentOptions.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          {/* Semester & Graduation Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-headline font-bold text-slate-700">Current Semester</label>
              <select
                value={formData.sem}
                onChange={(e) => setFormData({ ...formData, sem: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              >
                {['SEM 1', 'SEM 2', 'SEM 3', 'SEM 4', 'SEM 5', 'SEM 6', 'SEM 7', 'SEM 8'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-headline font-bold text-slate-700">Graduation Class</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
              >
                {["'25", "'26", "'27", "'28", "'29"].map((y) => (
                  <option key={y} value={y}>
                    Class of {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Campus Interests Tags */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-headline font-bold text-slate-700">
              Campus Interests & Clubs
            </label>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((interest) => {
                const selected = formData.interests.includes(interest)
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-full text-xs font-headline font-semibold transition-all cursor-pointer ${
                      selected
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                    }`}
                  >
                    {selected ? `✓ ${interest}` : `+ ${interest}`}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-headline font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Set Up Later
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-headline font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <span>Save & Enter Portal</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
