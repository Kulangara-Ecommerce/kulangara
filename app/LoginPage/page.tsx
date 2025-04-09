"use client";

import { useState } from "react";
import { Button } from "../components/ui/buttons";
import { Input } from "../components/ui/input";
import Image from "next/image";
import { Icon, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex w-1/2 relative">
        <div className="relative w-full h-full overflow-hidden">
          <Image
            src="/images/coming-soon.jpg"
            alt="Kulangara Hero"
            fill
            className="w-full h-full object-cover scale-115"
          />
        </div>
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex flex-col justify-between p-8 text-white">
          <h1 className="text-3xl font-extrabold">KULANGARA</h1>
          <div className="bottom-text-box">
            <p className="max-w-2xl text-sm">
              H&amp;M Group is a global fashion and design company, with over
              4,000 stores in more than 79 markets and online sales in 60
              markets.
            </p>
            <p className="text-xs py-2 ">© 2025, Kulangara</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-32">
        <div className="absolute top-6 right-6 ">
          <Button variant="outline" size="sm" onClick={() => {}}>
            Signup
          </Button>
        </div>
        <div className="md:p-14 lg:p-10 max-w-md mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Login</h2>
            <p className="text-gray-500">Enter your email below to login</p>
          </div>
          <form onSubmit={() => {}} className="space-y-4 mb-6">
            <Input
              type="email"
              placeholder="user@gmail.com"
              className="w-full h-12"
            />
            <Button
              variant="default"
              size="lg"
              className="w-full h-12"
              onClick={() => {}}
            >
              Login
            </Button>
          </form>
          <div className="flex items-center mb-6">
            <hr className="flex-1" />
            <span className="px-2 text-gray-300 text-xs">OR CONTINUE WITH</span>
            <hr className="flex-1" />
          </div>
          <Button
            variant="outline"
            size="lg"
            className="w-full  h-12"
            onClick={() => {}}
          >
            <img src="/icons/google-icon.svg" alt="Google" className="w-4" />
            Google
          </Button>
          <div className="py-4">
            <p className="text-xs text-gray-500">
              By clicking continue, you agree to our{" "}
              <a href="/terms" className="underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
