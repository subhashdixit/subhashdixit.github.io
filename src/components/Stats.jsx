import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const Stats = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const stats = [
    { value: '5+', label: 'Years Experience' },
    { value: '51', label: 'GitHub Repos' },
    { value: '500+', label: 'Models Built' },
    { value: '88%', label: 'Avg Accuracy' }
  ]

  return (
    <section ref={ref} className="py-16 bg-white border-y border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{
                delay: 0.1 + (index * 0.1),
                duration: 0.6,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{ scale: 1.05 }}
              className="text-center"
            >
              <h3 className="text-5xl sm:text-6xl font-bold text-red-700 mb-2">
                {stat.value}
              </h3>
              <p className="text-sm font-medium text-neutral-600">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Stats
