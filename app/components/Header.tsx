"use client";
import React, { useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { ThemeToggle } from "./Themetoggle";
import { Button } from "@/components/ui/button";

// Direct link to the APK asset — starts the download immediately instead of
// sending people to the GitHub release page first. If you cut a new release,
// either update the tag/filename here or point this at
// ".../releases/latest/download/NeuralLearn.apk" (that redirect always
// resolves to whatever your most recent release contains).
const MOBILE_DOWNLOAD_URL =
  "https://github.com/XTech-Head/NeauralLearnMobile/releases/download/v1.0.0/NeuralLearn.apk";

// SHA-256 of NeuralLearn.apk (v1.0.0), shown as a tooltip so anyone who
// wants to verify the download's integrity can do so.
const MOBILE_APK_SHA256 =
  "bb30dee7ff7238dc3f61c388e91f10e08d04a22f65287813f68228bc36aa0d48";

function Header() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">

        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer shrink-0"
          onClick={() => { router.push('/'); setMenuOpen(false); }}
        >
          <img
            src="/icons/icon-32.png"
            alt="Xtech logo"
            className="h-9 w-9 rounded-lg"
          />
          <span className="text-xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            NeuralLearn
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
         
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <a
              href={MOBILE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={`SHA-256: ${MOBILE_APK_SHA256}`}
            >
              <Download className="h-4 w-4" />
              Get the App
            </a>
          </Button>
          <ThemeToggle />
          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <>
              <button
                onClick={() => router.push('/sign-in')}
                className="px-4 py-2 text-sm font-medium text-foreground hover:text-purple-600 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/sign-up')}
                className="px-4 py-2 text-sm font-semibold bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Mobile Right Side */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          {isSignedIn && <UserButton afterSignOutUrl="/" />}

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex flex-col justify-center items-center w-10 h-10 gap-1.25 rounded-md hover:bg-accent transition-colors"
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-foreground rounded transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-1.75" : ""}`} />
            <span className={`block w-5 h-0.5 bg-foreground rounded transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-foreground rounded transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-1.75" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? "max-h-96 border-b border-border/40" : "max-h-0"}`}>
        <nav className="flex flex-col px-4 py-3 gap-1 bg-background/95 backdrop-blur">
          <a
            href="#features"
            onClick={() => setMenuOpen(false)}
            className="px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMenuOpen(false)}
            className="px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            How It Works
          </a>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-2 mt-1 w-full justify-center"
            onClick={() => setMenuOpen(false)}
          >
            <a
              href={MOBILE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={`SHA-256: ${MOBILE_APK_SHA256}`}
            >
              <Download className="h-4 w-4" />
              Get the App
            </a>
          </Button>

          {!isSignedIn && (
            <div className="flex flex-col gap-2 pt-2 mt-1 border-t border-border/40">
              <button
                onClick={() => { router.push('/sign-in'); setMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-sm font-medium text-foreground hover:text-purple-600 hover:bg-accent rounded-lg transition-colors text-left"
              >
                Sign In
              </button>
              <button
                onClick={() => { router.push('/sign-up'); setMenuOpen(false); }}
                className="w-full px-4 py-2.5 text-sm font-semibold bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Get Started
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;