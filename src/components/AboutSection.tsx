import { Hand, ShieldCheck, Cpu, Globe2, Sparkles, Heart } from "lucide-react";

export function AboutSection() {
  return (
    <section className="about-section section-shell" id="about">
      <div className="section-heading-row">
        <div>
          <div className="section-index">05 / INDIAN SIGN LANGUAGE & TECHNOLOGY GUIDE</div>
          <h2>
            Bridging the Space<br />
            <em>Between People.</em>
          </h2>
        </div>
        <p className="section-intro">
          Learn how SignSpeak leverages modern computer vision, two-handed geometric analysis, and client-side AI to translate Indian Sign Language into natural spoken communication.
        </p>
      </div>

      <div className="about-cards-grid">
        <div className="about-card">
          <div className="about-card-icon">
            <Hand size={24} />
          </div>
          <h3>Why Indian Sign Language (ISL)?</h3>
          <p>
            Indian Sign Language is the primary language for millions of deaf and hard of hearing individuals across India. Unlike American Sign Language (ASL), ISL utilizes a distinct bilingual grammar and is heavily reliant on <strong>two-handed signs</strong> (such as <em>Namaste</em>, <em>Help</em>, <em>House</em>, <em>Where</em>, and <em>Family</em>).
          </p>
        </div>

        <div className="about-card">
          <div className="about-card-icon">
            <Cpu size={24} />
          </div>
          <h3>Dual-Hand 42-Landmark Architecture</h3>
          <p>
            Standard web models track only one hand. SignSpeak tracks up to <strong>two hands simultaneously (21 + 21 = 42 landmarks)</strong>, analyzing wrist-relative coordinate vectors, scale invariants, and inter-hand spatial offsets to distinguish subtle two-handed signs.
          </p>
        </div>

        <div className="about-card">
          <div className="about-card-icon">
            <Sparkles size={24} />
          </div>
          <h3>Immediate Sentence Synthesizer</h3>
          <p>
            Signing words in sequence (e.g. <code>[NAMASTE, I, WATER, WANT]</code>) is telegraphic. Our instant sentence synthesizer immediately converts sign tokens into natural, grammatically complete sentences in <strong>English</strong>, <strong>Hindi (हिन्दी)</strong>, and <strong>Tamil (தமிழ்)</strong>.
          </p>
        </div>

        <div className="about-card">
          <div className="about-card-icon">
            <ShieldCheck size={24} />
          </div>
          <h3>100% Client-Side Privacy</h3>
          <p>
            Every camera frame is processed in your device's browser memory using WebGL acceleration. No video feeds or images are ever uploaded to any cloud server, guaranteeing total privacy for users.
          </p>
        </div>
      </div>

      {/* ISL Quick Fact Bar */}
      <div className="about-facts-bar">
        <div className="fact-item">
          <strong>42</strong>
          <span>Key ISL Gestures Pre-loaded</span>
        </div>
        <div className="fact-item">
          <strong>2 Hands</strong>
          <span>Simultaneous Skeletal Tracking</span>
        </div>
        <div className="fact-item">
          <strong>3 Languages</strong>
          <span>English, Hindi & Tamil Output</span>
        </div>
        <div className="fact-item">
          <strong>0 ms</strong>
          <span>Server Latency (Edge Execution)</span>
        </div>
      </div>
    </section>
  );
}
