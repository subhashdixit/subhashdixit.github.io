import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { FaEnvelope, FaGithub, FaLinkedin, FaMapMarkerAlt, FaPaperPlane } from 'react-icons/fa'

const contactEmail = 'subhashdixit17@gmail.com'

const formEndpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT?.trim() || 'https://formspree.io/f/xwlokvgk'

const Contact = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const [status, setStatus] = useState('')
  const submitting = useRef(false)
  const confirmation = useRef(null)
  const [isSending, setIsSending] = useState(false)

  async function sendMessage(event) {
    event.preventDefault()
    if (submitting.current) return

    const form = event.currentTarget
    const fields = new FormData(form)

    submitting.current = true
    setIsSending(true)
    setStatus('')

    try {
      const response = await fetch(formEndpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fields,
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      })

      if (response.ok && (await response.json()).ok === true) {
        form.reset()
        confirmation.current?.showModal()
      } else if (response.status === 429) {
        setStatus('Too many submissions. Please wait a moment and try again.')
      } else {
        setStatus('Could not submit your message. Please try again or use the email link.')
      }
    } catch {
      setStatus('Could not confirm your submission. Please try again or use the email link.')
    } finally {
      submitting.current = false
      setIsSending(false)
    }
  }

  const contactInfo = [
    {
      icon: FaEnvelope,
      label: 'Email',
      value: contactEmail,
      link: `mailto:${contactEmail}`
    },
    {
      icon: FaLinkedin,
      label: 'LinkedIn',
      value: '@subhash-dixit-nit-durgapur',
      link: 'https://www.linkedin.com/in/subhash-dixit-nit-durgapur/'
    },
    {
      icon: FaGithub,
      label: 'GitHub',
      value: '@subhashdixit',
      link: 'https://github.com/subhashdixit'
    },
    {
      icon: FaMapMarkerAlt,
      label: 'Phone',
      value: '+91 92059 79486',
      link: 'tel:+919205979486'
    }
  ]

  return (
    <section id="contact" className="py-32 bg-black relative overflow-hidden" ref={ref}>

      {/* Background pattern */}
      <div className="absolute inset-0 pattern-lines opacity-5"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-2 border border-zinc-700/50 rounded-sm text-xs text-zinc-400 uppercase tracking-wider mb-6"
          >
            Get In Touch
          </motion.div>
          <h2 className="text-5xl sm:text-6xl font-light text-white mb-6">
            Let's<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Connect</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Ready to turn your data into insights? Let's discuss your next project
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4"
          >
            {contactInfo.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4 + (index * 0.1), duration: 0.6 }}
                whileHover={{ scale: 1.02 }}
              >
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 hover:border-teal-400/30 rounded-lg p-6 flex items-center gap-4 transition-all duration-300"
                  >
                    <div className="w-12 h-12 bg-teal-400/10 border border-teal-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-light text-zinc-500 mb-1">
                        {item.label}
                      </p>
                      <p className="text-sm break-words font-light text-white">
                        {item.value}
                      </p>
                    </div>
                  </a>
                ) : (
                  <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-400/10 border border-teal-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                      <p className="text-xs font-light text-zinc-500 mb-1">
                        {item.label}
                      </p>
                      <p className="text-sm font-light text-white">
                        {item.value}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <form
              className="loop-contact-form bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-8"
              onSubmit={sendMessage}
            >
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-light text-zinc-400 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    id="contact-name"
                    name="name"
                    maxLength={120}
                    className="w-full px-4 py-3 bg-black/50 border border-zinc-800/50 rounded-sm text-white focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 outline-none transition-colors font-light"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-light text-zinc-400 mb-2">
                    Your Email
                  </label>
                  <input
                    type="email"
                    required
                    id="contact-email"
                    name="email"
                    maxLength={254}
                    className="w-full px-4 py-3 bg-black/50 border border-zinc-800/50 rounded-sm text-white focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 outline-none transition-colors font-light"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="contact-subject" className="block text-sm font-light text-zinc-400 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  id="contact-subject"
                  name="subject"
                  maxLength={200}
                  className="w-full px-4 py-3 bg-black/50 border border-zinc-800/50 rounded-sm text-white focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 outline-none transition-colors font-light"
                  placeholder="Project Discussion"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="contact-message" className="block text-sm font-light text-zinc-400 mb-2">
                  Message
                </label>
                <textarea
                  rows="5"
                  required
                  id="contact-message"
                  name="message"
                  maxLength={5000}
                  className="w-full px-4 py-3 bg-black/50 border border-zinc-800/50 rounded-sm text-white focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 outline-none transition-colors resize-none font-light"
                  placeholder="Tell me about your project..."
                ></textarea>
              </div>

              <motion.button
                type="submit"
                disabled={isSending}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-6 py-4 border border-white/20 hover:border-white/40 text-white font-light rounded-sm transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSending ? 'Submitting…' : 'Submit'}
                <FaPaperPlane className="w-4 h-4" />
              </motion.button>
              {status && <p role="alert" className="mt-4 text-sm text-zinc-300">{status}</p>}
            </form>
            <dialog ref={confirmation} className="loop-contact-confirmation"
              aria-labelledby="contact-confirmation-title" aria-describedby="contact-confirmation-message">
              <h2 id="contact-confirmation-title">Message submitted</h2>
              <p id="contact-confirmation-message">Thanks for reaching out.</p>
              <form method="dialog">
                <button autoFocus type="submit">Done</button>
              </form>
            </dialog>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Contact
