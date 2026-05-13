import Image from "next/image";
import Link from "next/link";

interface EmailSentSuccessProps {
  message: string;
  buttonText?: string;
}

export default function EmailSentSuccess({
  message,
  buttonText = "Proceed to Login",
}: EmailSentSuccessProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12">
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-6 text-center shadow-lg">
        {/* Logo */}
        <Image
          src="/globe.svg"
          alt="Rendezvous Logo"
          width={120}
          height={72}
          className="mb-4 mx-auto dark:invert opacity-80"
        />

        {/* Heading */}
        <h3 className="text-2xl font-bold mb-4 text-green-600">
          Check Your Email
        </h3>

        {/* Description */}
        <p className="mb-6 text-gray-700 dark:text-gray-300">{message}</p>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          If you didn&apos;t receive an email or request a new verification
          email
        </p>

        {/* Button to go to login page */}
        <Link href="/auth/login" className="btn btn-submit p-4 w-full">
          {buttonText}
        </Link>
      </div>
    </div>
  );
}
