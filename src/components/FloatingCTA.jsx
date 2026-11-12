import { motion } from 'framer-motion'
import { FaRocket } from 'react-icons/fa'

const FloatingCTA = () => {
  const scrollToContact = () => {
    const contactSection = document.getElementById('contact')
    contactSection?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, duration: 0.5 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={scrollToContact}
      className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 rounded-full shadow-lg shadow-teal-500/50 flex items-center justify-center text-white transition-all duration-300 group"
      aria-label="Hire Me"
    >
      <FaRocket className="w-5 h-5 group-hover:rotate-12 transition-transform" />

      {/* Tooltip */}
      <span className="absolute right-16 bg-zinc-900 border border-teal-400/30 text-white text-sm px-4 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Let's Work Together! 🚀
      </span>

      {/* Pulse animation */}
      <span className="absolute inset-0 rounded-full bg-teal-400 animate-ping opacity-20"></span>
    </motion.button>
  )
}

export default FloatingCTA
