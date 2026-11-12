import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const Skills = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const skillCategories = [
    {
      title: 'Programming & Tools',
      skills: ['Python', 'SQL', 'PySpark', 'Excel', 'Git', 'Docker'],
      number: '01'
    },
    {
      title: 'ML & Statistics',
      skills: ['Scikit-learn', 'XGBoost', 'Regression', 'Clustering', 'A/B Testing'],
      number: '02'
    },
    {
      title: 'Forecasting & Time Series',
      skills: ['ARIMA', 'SARIMA', 'Prophet', 'Exponential Smoothing'],
      number: '03'
    },
    {
      title: 'AI & Transformers',
      skills: ['Transformers.js', 'ONNX Runtime', 'WebAssembly', 'Qwen2.5', 'SmolLM2'],
      number: '04'
    },
    {
      title: 'Cloud & Platforms',
      skills: ['Databricks', 'AWS', 'Flask', 'Streamlit', 'GitHub Actions'],
      number: '05'
    },
    {
      title: 'Data Engineering',
      skills: ['Pandas', 'NumPy', 'Apache Spark', 'PostgreSQL', 'ETL'],
      number: '06'
    }
  ]

  return (
    <section id="skills" className="py-32 bg-black relative overflow-hidden" ref={ref}>

      {/* Background pattern */}
      <div className="absolute inset-0 pattern-dots opacity-5"></div>

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
            Technical Skills
          </motion.div>
          <h2 className="text-5xl sm:text-6xl font-light text-white mb-6">
            Technology<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Stack</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {skillCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + (categoryIndex * 0.1), duration: 0.8 }}
              whileHover={{ y: -5 }}
              className="relative group bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 hover:border-teal-400/30 rounded-lg p-8 overflow-hidden transition-all duration-300"
            >
              {/* Pattern overlay */}
              <div className="absolute inset-0 pattern-dots opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              {/* Diagonal corner accent */}
              <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-transparent transform rotate-45"></div>
              </div>

              <div className="relative z-10">
                {/* Number badge */}
                <span className="text-xs text-zinc-600 font-mono mb-4 block">/ {category.number}</span>

                <h3 className="text-xl font-light text-white mb-6 group-hover:text-teal-400 transition-colors duration-300">
                  {category.title}
                </h3>

                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill, skillIndex) => (
                    <motion.span
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={isInView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ delay: 0.4 + (categoryIndex * 0.1) + (skillIndex * 0.05), duration: 0.4 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="px-3 py-1.5 bg-teal-400/10 border border-teal-400/20 text-teal-400 text-sm font-light rounded-sm hover:bg-teal-400/20 transition-all duration-300"
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Skills
