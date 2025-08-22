import React from 'react';
import '../styles/Footer.css';
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Youtube } from 'lucide-react'; // Using lucide-react for icons

const Footer = () => {
  // Function to handle scrolling to the top of the page
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer className="footer-container">
      <div className="footer-main-content">
        <div className="footer-column contact-info">
          <h3 className="footer-title">Department of Information Science and Technology</h3>
          <ul className="contact-list">
            <li><MapPin size={16} /> CEG Campus, Guindy, <br /> Anna University, Chennai - 600025</li>
            <li><Phone size={16} /> 044 2235 8812</li>
            <li><Mail size={16} /> istdept@auist.net</li>
          </ul>
          <h4 className="social-networks-title">Our Social Networks</h4>
          <div className="social-icons">
            <a href="https://www.facebook.com/auchennaiofficial" className="social-icon"><Facebook size={20} /></a>
            <a href="https://twitter.com/auvcochennai" className="social-icon"><Twitter size={20} /></a>
            <a href="https://www.instagram.com/anna_university.chennai/" className="social-icon"><Instagram size={20} /></a>
            <a href="https://www.youtube.com/channel/UCvR0vYmjwNCmVFyTdSAKvMA" className="social-icon"><Youtube size={20} /></a>
          </div>
        </div>

        <div className="footer-column useful-links">
          <h3 className="footer-title">Useful Links</h3>
          <ul>
            <li><a href="https://www.annauniv.edu/">Anna University</a></li>
            <li><a href="https://ceg.annauniv.edu/">CEG Campus</a></li>
            <li><a href="https://www.auegov.ac.in/">Centre for e-Governance</a></li>
            <li><a href="https://aucoe.annauniv.edu/">Controller of Examination</a></li>
            <li><a href="https://acoe.annauniv.edu/">Additional Controller of Examination</a></li>
            <li><a href="https://cac.annauniv.edu/">Centre for Academic Courses</a></li>
            <li><a href="https://www.annauniv.edu/dsa/">Centre for Student Affairs</a></li>
          </ul>
        </div>

        <div className="footer-column map-link">
           <h3 className="footer-title">Our Map Link</h3>
           <div className="map-container">
            <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.007575798235!2d80.2322656148227!3d13.03527999081367!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a526786375f197f%3A0x824b2140682125f!2sDepartment%20of%20Information%20Science%20and%20Technology%2C%20Anna%20University!5e0!3m2!1sen!2sin!4v1663828318224!5m2!1sen!2sin"
                width="100%"
                height="200"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
           </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="copyright-text">© Copyright 2025. Department of Information Science and Technology, Anna University. All rights reserved.</p>
        <p className="credits-text">Designed & Developed by Department of Information Science and Technology.</p>
      </div>

      <button onClick={scrollToTop} className="scroll-to-top" title="Go to top">
        &#9650; {/* Up arrow character */}
      </button>
    </footer>
  );
};

export default Footer;
