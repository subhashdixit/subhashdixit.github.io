import { motion } from 'framer-motion'
import { TypeAnimation } from 'react-type-animation'
import { FaGithub, FaLinkedin, FaEnvelope, FaPaperPlane } from 'react-icons/fa'
import { useState } from 'react'
import profileImage from '../assets/profile.png'

const Hero = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })

  const socialLinks = [
    { icon: FaGithub, href: 'https://github.com/subhashdixit', label: 'GitHub' },
    { icon: FaLinkedin, href: 'https://www.linkedin.com/in/subhash-dixit-nit-durgapur/', label: 'LinkedIn' },
    { icon: FaEnvelope, href: 'mailto:subhashdixit17@gmail.com', label: 'Email' }
  ]

  return (
    <section id="home" className="min-h-screen relative overflow-hidden bg-black">

      {/* Diagonal line pattern background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 35px,
            rgba(20, 184, 166, 0.3) 35px,
            rgba(20, 184, 166, 0.3) 37px
          )`
        }}></div>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 via-transparent to-cyan-900/20"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 min-h-screen flex items-center">

        <div className="grid lg:grid-cols-2 gap-12 items-start w-full py-20">

          {/* Left Content */}
          <div className="lg:pt-0">
            {/* Small badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-block mb-6"
            >
              <div className="px-4 py-2 border border-zinc-700/50 rounded-sm text-xs text-zinc-400 uppercase tracking-wider">
                👋 Hello, I'm
              </div>
            </motion.div>

            {/* Name */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-light text-white leading-[1.1] mb-4"
            >
              Subhash Dixit
            </motion.h1>

            {/* Role with typing animation */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-2xl sm:text-3xl font-light mb-8"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
                <TypeAnimation
                  sequence={[
                    'Senior Data Scientist',
                    2000,
                    'Machine Learning Engineer',
                    2000,
                    'AI Solutions Architect',
                    2000,
                    'NLP Specialist',
                    2000,
                  ]}
                  wrapper="span"
                  speed={50}
                  repeat={Infinity}
                />
              </span>
            </motion.div>

            {/* Key Info */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="space-y-3 mb-8"
            >
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                <span className="font-light">Senior Data Scientist at <span className="text-teal-400">Epam Systems</span></span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                <span className="font-light"><span className="text-green-400 font-normal">5+ Years</span> Experience in Data Science & ML</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                <span className="font-light"><span className="text-green-400 font-normal">51 Repositories</span> on GitHub</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                <span className="font-light">B.Tech Civil Engineering from <span className="text-teal-400">NIT Durgapur</span> (CGPA: 8.71/10)</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                <span className="font-light">📍 Kolkata, India</span>
              </div>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-base text-zinc-400 mb-8 leading-relaxed"
            >
              Turning business questions into practical data products—from demand forecasting, pricing, and customer analytics.
              Building document intelligence tools using local LLMs and deploying browser-based AI applications.
            </motion.p>

            {/* Profile Image - Mobile/Tablet */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="lg:hidden mb-8 flex justify-center"
            >
              <div className="relative">
                <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-teal-400/30 shadow-xl shadow-teal-400/20">
                  <img
                    src={profileImage}
                    alt="Subhash Dixit"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-teal-400/20 border border-teal-400/30 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👨‍💻</span>
                </div>
              </div>
            </motion.div>

            <a href="#work" className="inline-block mb-6 px-5 py-3 rounded-sm border border-teal-400/40 bg-teal-400/10 text-teal-200 hover:bg-teal-400/20">
              Explore selected work ↘
            </a>

            {/* Social Links */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex items-center gap-4"
            >
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + (index * 0.1), duration: 0.5 }}
                  whileHover={{ y: -3 }}
                  className="w-12 h-12 bg-white/5 backdrop-blur-sm border border-white/10 hover:border-teal-400/50 hover:bg-teal-400/10 rounded-sm flex items-center justify-center text-zinc-400 hover:text-teal-400 transition-all duration-300"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </motion.div>
          </div>

          {/* Right Content - Image */}
          <div>
            {/* Profile Image - Desktop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="hidden lg:block mb-8"
            >
              <div className="relative flex items-start justify-center">
                {/* Circular profile image container */}
                <div className="relative w-64 h-64">
                  {/* Circular image with perfect round border */}
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-teal-400/30 shadow-2xl shadow-teal-400/20">
                    <img
                      src={profileImage}
                      alt="Subhash Dixit"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Decorative rings - all perfectly circular */}
                  <div className="absolute inset-0 rounded-full border-2 border-teal-400/20 animate-pulse" style={{ animationDuration: '3s' }}></div>
                  <div className="absolute -inset-2 rounded-full border border-cyan-400/10"></div>
                </div>

                {/* Status badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-zinc-900 border border-teal-400/30 rounded-full flex items-center gap-2 whitespace-nowrap"
                >
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-light text-white">Available for projects</span>
                </motion.div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>

    </section>
  )
}

export default Hero
