"use client";
import { useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import Link from "next/link";
import Joi from "joi";
import type { LoginFormData } from "@/types/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import InputField from "@/components/ui/inputs/InputField";
import Image from "next/image";

// Login form schema
const loginSchema = Joi.object({
  email: Joi.string().required().email().messages({
    "string.empty": "Email cannot be blank",
    "string.email": "Please enter in a valid email address",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password cannot be blank",
  }),
});

export default function Login() {
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: joiResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function onSubmit(data: LoginFormData) {
    setIsLoggingIn(true);
    try {
      await login(data);
    } catch (error) {
      console.error(error);
      setIsLoggingIn(false);
      reset();
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12">
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-6 text-center shadow-sm transition-shadow duration-300 hover:shadow-md">
        {/* Logo */}
        <Image
          src="/globe.svg"
          alt="Rendezvous Logo"
          width={120}
          height={120}
          className="mb-4 mx-auto dark:invert opacity-80"
        />
        {/* Heading */}
        <h3 className="mb-4 text-gray-900 dark:text-gray-100">
          Login to Rendezvous
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email field */}
          <InputField
            name="email"
            placeholder="Email"
            label="Email"
            register={register}
            error={errors.email}
          />

          {/* Password field */}
          <InputField
            name="password"
            placeholder="Password"
            type="password"
            label="Password"
            register={register}
            error={errors.password}
          />

          {/* Login button */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="btn btn-submit w-full my-2"
          >
            {isLoggingIn ? "Logging in..." : "Login"}
          </button>

          {/* Link to register page */}
          <p className="mb-4 text-gray-700 dark:text-gray-300">Do not have a Rendezvous Account? </p>
          <Link
            href="/auth/register"
            className="text-cyan-600 dark:text-cyan-400 decoration-cyan-500 decoration-solid hover:text-cyan-500 dark:hover:text-cyan-300 hover:underline"
          >
            Create a Rendezvous Account
          </Link>

          {/* Link to forgot password page */}
          <p className="mt-1">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
            >
              Forgot Password?
            </Link>
          </p>

          {/* Link to resend verification email page */}
          <p className="mt-1">
            <Link
              href="/auth/resend-verification"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
            >
              Resend Verification Email
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
