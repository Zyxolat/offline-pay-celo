import { Github, Twitter, Linkedin } from "lucide-react";

const footerLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "Benefits", href: "#benefits" },
  { label: "Contact", href: "#contact" },
];

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <a href="#" className="font-display text-xl font-bold text-foreground">
              Offline<span className="gradient-text">Pay</span>
            </a>
            <p className="text-sm text-muted-foreground mt-2">Crypto payments that work everywhere.</p>
          </div>

          <div className="flex flex-wrap gap-6 justify-center">
            {footerLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {[Twitter, Github, Linkedin].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} zyxolat. All rights reserved. Built on the Celo blockchain.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
