import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { ContactForm } from '../components/ContactForm'
import GridScan from '../components/ReactBits/GridScan/GridScan'

export default function Contact() {
  const showToast = useToast()
  const navigate = useNavigate()

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/events')
    }
  }

  const handleContactSubmit = async (_values) => {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        showToast('Message sent! Our support team will reach out shortly.')
        resolve()
      }, 1200)
    })
  }

  return (
    <div className="min-h-screen w-full bg-[#09090f] flex flex-col items-center justify-center p-4 pt-20 pb-16 relative overflow-hidden">
      <GridScan
        sensitivity={0.55}
        lineThickness={1}
        linesColor="#2F293A"
        gridScale={0.1}
        scanColor="#FF9FFC"
        scanOpacity={0.4}
        enablePost
        bloomIntensity={0.6}
        chromaticAberration={0.002}
        noiseIntensity={0.01}
      />
      
      <button
        onClick={handleClose}
        className="absolute top-20 right-6 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-colors border border-white/20 z-20 shadow-lg cursor-pointer"
        aria-label="Back"
      >
        <span className="material-symbols-outlined text-[22px]">close</span>
      </button>

      <div className="w-full max-w-md animate-fade-in-up mt-12 md:mt-0 relative z-10">
        <div className="text-center mb-8">
          <h2 className="font-headline text-3xl md:text-4xl text-white font-extrabold tracking-tight drop-shadow-md mb-3">
            We're here to help
          </h2>
          <p className="text-white/70 text-sm md:text-base font-medium">
            Reach out to us for event inquiries, partnership opportunities, or technical support.
          </p>
        </div>

        <ContactForm 
          onSubmit={handleContactSubmit} 
          className="shadow-2xl mx-auto" 
        />
      </div>
    </div>
  )
}
