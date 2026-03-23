import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Search, Globe, ArrowRight, CheckCircle2, BarChart3, Brain, Sparkles, Shield, ChevronRight } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

/* ───── Animated mesh gradient background ───── */
const MeshBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 2.5;
    };
    resize();
    window.addEventListener('resize', resize);

    const blobs = [
      { x: 0.15, y: 0.08, r: 350, color: 'rgba(79, 195, 247, 0.12)', speed: 0.0003, phase: 0 },
      { x: 0.85, y: 0.12, r: 300, color: 'rgba(3, 169, 244, 0.08)', speed: 0.0004, phase: 1 },
      { x: 0.5, y: 0.25, r: 400, color: 'rgba(179, 229, 252, 0.15)', speed: 0.0002, phase: 2 },
      { x: 0.2, y: 0.4, r: 250, color: 'rgba(79, 195, 247, 0.06)', speed: 0.0005, phase: 3 },
      { x: 0.8, y: 0.35, r: 320, color: 'rgba(2, 136, 209, 0.07)', speed: 0.00035, phase: 4 },
      { x: 0.5, y: 0.55, r: 280, color: 'rgba(225, 245, 254, 0.2)', speed: 0.00025, phase: 5 },
    ];

    const draw = () => {
      time += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      blobs.forEach(blob => {
        const bx = (blob.x + Math.sin(time * blob.speed + blob.phase) * 0.06) * canvas.width;
        const by = (blob.y + Math.cos(time * blob.speed * 0.7 + blob.phase) * 0.04) * canvas.height;
        const gradient = ctx.createRadialGradient(bx, by, 0, bx, by, blob.r * (canvas.width / 1400));
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, 'rgba(250, 251, 252, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

/* ───── Floating particles ───── */
const FloatingParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.3 + 0.1,
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'var(--primary)',
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, 20, -20, 0],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

/* ───── Premium Liquid Data Waves Pattern ───── */
const LiquidWavesBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let time = 0;

    let width, height;

    const waves = [
      { yOffset: 0.55, amplitude: 140, length: 0.002, speed: 0.008, color: 'rgba(3, 169, 244, 0.4)' },
      { yOffset: 0.65, amplitude: 110, length: 0.003, speed: 0.012, color: 'rgba(79, 195, 247, 0.5)' },
      { yOffset: 0.75, amplitude: 90, length: 0.004, speed: 0.018, color: 'rgba(2, 136, 209, 0.3)' },
      { yOffset: 0.85, amplitude: 60, length: 0.005, speed: 0.025, color: 'rgba(129, 212, 250, 0.6)' },
    ];

    const resize = () => {
      const parent = canvas.parentElement;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };
    
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      time += 1;

      ctx.globalCompositeOperation = 'screen';

      waves.forEach((wave, i) => {
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        for (let x = 0; x <= width; x += 15) {
          const sine1 = Math.sin(x * wave.length + time * wave.speed);
          const sine2 = Math.sin(x * wave.length * 0.5 - time * wave.speed * 0.7 + i);
          
          const y = height * wave.yOffset + (sine1 + sine2) * wave.amplitude;
          if (x === 0) {
              ctx.moveTo(x, y);
          } else {
              ctx.lineTo(x, y);
          }
        }

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        // Create gradient fill extending down
        const gradient = ctx.createLinearGradient(0, height * wave.yOffset - wave.amplitude, 0, height);
        gradient.addColorStop(0, wave.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '110vh',
        pointerEvents: 'none',
        zIndex: 1,
        maskImage: 'radial-gradient(ellipse 100% 100% at 50% 20%, black, transparent)',
        WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 50% 20%, black, transparent)',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};

/* ───── Feature Card ───── */
const FeatureCard = ({ icon, title, description, delay, step }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-50px' }}
    transition={{ delay, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    whileHover={{ y: -8, scale: 1.02 }}
    style={{
      background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6))',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 'var(--radius-xl)',
      padding: '2.5rem',
      border: '1px solid rgba(255, 255, 255, 0.8)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
      textAlign: 'left',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'default',
      transition: 'box-shadow 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}
  >
    <span style={{
      position: 'absolute',
      top: -10,
      right: 10,
      fontSize: '8rem',
      fontWeight: 900,
      color: 'rgba(79, 195, 247, 0.05)',
      lineHeight: 1,
      userSelect: 'none',
      letterSpacing: '-0.05em',
      zIndex: 0
    }}>{step}</span>

    <div style={{
      width: 58,
      height: 58,
      borderRadius: '16px',
      background: 'linear-gradient(135deg, rgba(79, 195, 247, 0.15), rgba(3, 169, 244, 0.05))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--primary)',
      marginBottom: '1.5rem',
      position: 'relative',
      zIndex: 1,
      border: '1px solid rgba(79, 195, 247, 0.2)'
    }}>
      {icon}
    </div>
    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', position: 'relative', zIndex: 1 }}>{title}</h3>
    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, position: 'relative', zIndex: 1 }}>{description}</p>
  </motion.div>
);

/* ───── Stat Pill ───── */
const StatPill = ({ icon, text, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.8rem',
      padding: '0.8rem 1.6rem',
      background: 'white',
      borderRadius: '100px',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-primary)',
      fontSize: '0.95rem',
      fontWeight: 600,
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
      transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    }}
    whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(3, 169, 244, 0.1)' }}
  >
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3, 169, 244, 0.1)',
        color: 'var(--primary-dark)',
        padding: '0.4rem',
        borderRadius: '50%'
    }}>
        {icon}
    </div>
    {text}
  </motion.div>
);

/* ───── Animated typing text rotator ───── */
const RotatingWords = () => {
  const words = ['Claims', 'News', 'Statements', 'Sources'];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span style={{ display: 'inline-block', position: 'relative', minWidth: '11ch' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            position: 'absolute',
            left: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
      {/* Invisible text for layout sizing */}
      <span style={{ visibility: 'hidden' }}>Statements</span>
    </span>
  );
};

/* ═══════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════ */
const LandingPage = () => {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, 60]);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ overflowX: 'hidden', background: 'var(--bg-main)', position: 'relative' }}>

      {/* Background layers */}
      <MeshBackground />
      <LiquidWavesBackground />
      <FloatingParticles />

      {/* ─── Navbar ─── */}
      <motion.nav
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: navScrolled ? '0.8rem 2.5rem' : '1.25rem 2.5rem',
          maxWidth: 1200,
          margin: '0 auto',
          background: navScrolled ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
          backdropFilter: navScrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: navScrolled ? 'blur(20px)' : 'none',
          borderBottom: navScrolled ? '1px solid rgba(79, 195, 247, 0.1)' : '1px solid transparent',
          borderRadius: navScrolled ? '0 0 var(--radius-lg) var(--radius-lg)' : '0',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius)',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(3, 169, 244, 0.3)',
          }}>
            <ShieldCheck size={20} style={{ color: 'white' }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Credify</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/login" className="btn btn-ghost" style={{ fontWeight: 600 }}>Login</Link>
          <Link to="/signup" className="btn btn-primary" style={{ boxShadow: '0 2px 12px rgba(3, 169, 244, 0.25)' }}>Get Started</Link>
        </div>
      </motion.nav>

      {/* ─── Hero Section ─── */}
      <motion.section
        style={{
          maxWidth: 900,
          margin: '0 auto',
          textAlign: 'center',
          padding: '2rem',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          opacity: heroOpacity,
          y: heroY,
        }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, rgba(79, 195, 247, 0.1), rgba(3, 169, 244, 0.06))',
              border: '1px solid rgba(79, 195, 247, 0.15)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--primary-dark)',
              letterSpacing: '0.02em',
              marginBottom: '1.5rem',
            }}
          >
            <Sparkles size={13} />
            AI-Powered Fact Verification
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            fontSize: 'clamp(3rem, 7.5vw, 5rem)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '1.5rem',
            lineHeight: 1.1,
            letterSpacing: '-0.04em',
          }}
        >
          Verify the{' '}
          <span style={{
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Truth</span>
          <br />
          In an Era of Misinformation
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{
            fontSize: 'clamp(1.15rem, 2vw, 1.4rem)',
            color: 'var(--text-secondary)',
            marginBottom: '2.5rem',
            maxWidth: 750,
            margin: '0 auto 2.5rem',
            lineHeight: 1.7,
          }}
        >
          Credify uses multi-agent AI to analyze claims against trusted data sources. Get instant, evidence-backed verdicts with full transparency.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}
        >
          <Link
            to="/signup"
            className="btn btn-primary btn-lg"
            style={{
              gap: '0.6rem',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              boxShadow: '0 4px 20px rgba(3, 169, 244, 0.35)',
              fontSize: '1.1rem',
              padding: '1.1rem 2.6rem',
            }}
          >
            Get Started Free
            <ArrowRight size={18} />
          </Link>
          <Link
            to="/login"
            className="btn btn-outline btn-lg"
            style={{
              fontSize: '1.1rem',
              padding: '1.1rem 2.6rem',
              borderColor: 'rgba(79, 195, 247, 0.25)',
            }}
          >
            View Demo
          </Link>
        </motion.div>

        {/* Social Proof / Extra info */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.5, duration: 0.6 }}
           style={{
             marginTop: '3.5rem',
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'center',
             gap: '1.2rem'
           }}
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Trusted by modern fact-checkers
          </p>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', opacity: 0.8 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <Brain size={18} style={{ color: 'var(--primary)' }} /> Multi-Agent AI
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <Globe size={18} style={{ color: 'var(--primary)' }} /> Live Data Access
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <ShieldCheck size={18} style={{ color: 'var(--primary)' }} /> Transparent Logic
             </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ─── How It Works ─── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '5rem 2rem 6rem', position: 'relative', zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 1.2rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            background: 'rgba(3, 169, 244, 0.08)',
            color: 'var(--primary-dark)',
            borderRadius: '100px',
            marginBottom: '1rem',
          }}>
            <Zap size={14} />
            How it works
          </span>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 800, marginBottom: '1.2rem', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            Three steps to the <span style={{ color: 'var(--primary)' }}>Truth</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 550, margin: '0 auto', fontSize: '1.1rem', lineHeight: 1.8 }}>
            Our multi-agent system ensures every claim is rigorously analyzed from multiple angles for complete accuracy.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <FeatureCard
            icon={<Search size={24} />}
            title="Claim Extraction"
            description="Our AI identifies verifiable claims from any text — articles, social media posts, or statements."
            delay={0.1}
            step="01"
          />
          <FeatureCard
            icon={<Brain size={24} />}
            title="Multi-Agent Debate"
            description="Proponent and Opponent agents argue for and against each claim using real evidence from trusted sources."
            delay={0.2}
            step="02"
          />
          <FeatureCard
            icon={<BarChart3 size={24} />}
            title="Verdict & Scoring"
            description="A Judge agent synthesizes the debate into a clear verdict with a confidence score and full reasoning."
            delay={0.3}
            step="03"
          />
        </div>
      </section>

      {/* ─── Trust Strip ─── */}
      <section style={{
        padding: '3rem 2rem',
        position: 'relative',
        zIndex: 2,
      }}>
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <StatPill icon={<CheckCircle2 size={17} />} text="Evidence-backed verdicts" delay={0.1} />
          <StatPill icon={<Globe size={17} />} text="Real-time source verification" delay={0.2} />
          <StatPill icon={<ShieldCheck size={17} />} text="Transparent reasoning" delay={0.3} />
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section style={{ padding: '6rem 2rem', position: 'relative', zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            textAlign: 'center',
            background: 'linear-gradient(160deg, #101828, #0a101b)',
            borderRadius: '2rem',
            padding: '5rem 2.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative Background Elements */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'radial-gradient(circle at top right, rgba(3, 169, 244, 0.15), transparent 50%), radial-gradient(circle at bottom left, rgba(79, 195, 247, 0.1), transparent 50%)',
            pointerEvents: 'none',
          }} />
          
          <div style={{
            position: 'absolute',
            top: '-20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            height: '100%',
            background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 800,
            marginBottom: '1.25rem',
            letterSpacing: '-0.02em',
            position: 'relative',
            color: '#fff',
            zIndex: 1
          }}>
            Ready to fight misinformation?
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            marginBottom: '2.5rem',
            fontSize: '1.1rem',
            lineHeight: 1.7,
            position: 'relative',
            maxWidth: 600,
            margin: '0 auto 2.5rem',
            zIndex: 1
          }}>
            Join Credify and get access to AI-powered fact verification.<br />It's free to start.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <Link
              to="/signup"
              className="btn btn-primary btn-lg"
              style={{
                gap: '0.6rem',
                background: '#fff',
                color: '#101828',
                boxShadow: '0 8px 16px rgba(255, 255, 255, 0.1)',
                fontSize: '1.1rem',
                padding: '1.1rem 2.8rem',
                fontWeight: 700,
                border: 'none'
              }}
            >
              Start Verifying Now
              <ChevronRight size={18} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '3rem 2.5rem',
        position: 'relative',
        zIndex: 2,
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-tertiary)', fontSize: '0.95rem', fontWeight: 500 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(3, 169, 244, 0.2)'
            }}>
              <ShieldCheck size={15} style={{ color: 'white' }} />
            </div>
            <span>© 2026 Credify. All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Link to="/login" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, transition: 'color 0.2s' }}>Login</Link>
            <Link to="/signup" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, transition: 'color 0.2s' }}>Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
