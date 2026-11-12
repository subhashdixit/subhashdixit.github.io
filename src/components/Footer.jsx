import { motion } from 'framer-motion'
import { FaGithub, FaLinkedin, FaEnvelope, FaHeart } from 'react-icons/fa'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const socialLinks = [
    { icon: FaGithub, href: 'https://github.com/subhashdixit', label: 'GitHub' },
    { icon: FaLinkedin, href: 'https://www.linkedin.com/in/subhash-dixit-nit-durgapur/', label: 'LinkedIn' },
    { icon: FaEnvelope, href: 'mailto:subhashdixit@example.com', label: 'Email' }
  ]

  return (
    <footer className="py-16 bg-black border-t border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col items-center text-center space-y-8">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl font-light text-white mb-2">Subhash Dixit</h3>
            <p className="text-sm font-light text-zinc-400">Senior Data Scientist & ML Engineer</p>
          </motion.div>

          {/* Social Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-4"
          >
            {socialLinks.map((social) => (
              <motion.a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -3 }}
                className="w-10 h-10 bg-zinc-900/50 border border-zinc-800/50 rounded-sm flex items-center justify-center text-zinc-400 hover:text-teal-400 hover:border-teal-400/30 transition-all duration-300"
                aria-label={social.label}
              >
                <social.icon className="w-5 h-5" />
              </motion.a>
            ))}
          </motion.div>

          {/* Copyright */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-sm text-zinc-500 pt-8 border-t border-zinc-800/50 w-full"
          >
            <p className="flex items-center justify-center gap-2 mb-2 font-light">
              Made with <FaHeart className="text-teal-400" /> using React + Tailwind CSS
            </p>
            <p className="font-light">© {currentYear} Subhash Dixit. All rights reserved.</p>
          </motion.div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
