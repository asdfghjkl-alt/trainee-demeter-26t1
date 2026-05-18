"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import InputField from "@/components/ui/inputs/InputField";
import TextArea from "@/components/ui/inputs/TextArea";
import { useState, useEffect } from "react";
import Link from "next/link";

//Create the type for Data
type CreateRoomFormData = {
  meetingName: string;
  category: string;
  date: string;
  description: string;
};


const IMAGES = [
  "/meetup.jpg",
  "/restaurant.avif",
  "/sport.jpeg",
  "/library.jpeg",
  "/studyRoom.jpeg"
];


//Create a fake code
function generateFakeCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function CreateRoomForm({ user }: any) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateRoomFormData>();

  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Create a 3 second timer to change index of images
    useEffect(() => {
    
    if (IMAGES.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % IMAGES.length);
    }, 3000);

    // Clean up  timer if the user leaves the page
    return () => clearInterval(timer);
  }, []);


  async function onSubmit(data: CreateRoomFormData) {
    setIsCreating(true);

    console.log("Fake room data:", data);

    setTimeout(() => {
      const code = generateFakeCode();

      setRoomCode(code);
      setIsCreating(false);


    
      // redirect to lobby with fake code
    //   router.push(`/rooms/${code}/lobby`);
    }, 800);
  }

  return (
    <div className="ml-40">

      {/* HEADER */}
      <h1 className="mt-10 mb-2 text-5xl font-bold text-gray-900 dark:text-white">
        Create Your Meetup {user?.fname}
      </h1>

      <p className="ml-1 text-lg text-gray-600 dark:text-gray-400 max-w-xl">
        Take charge of your meetup and choose a place where meaningful
        connection happen. Create a room and invite your friends. 
      </p>

      <div className="mt-10 flex gap-80">
        
        {/* Left side form */}
        <div className="w-full max-w-3xl rounded-xl bg-gray-200/75 dark:bg-gray-800/75 p-6 backdrop-blur-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <InputField
              label="Meeting Name"
              name="meetingName"
              placeholder="e.g. DevSoc Hangout"
              register={register}
              error={errors.meetingName}
            />

            <InputField
              label="Date"
              name="date"
              type="date"
              placeholder=""
              register={register}
              error={errors.date}
            />

            <div>
              <label className="mb-2 block font-medium text-gray-900 dark:text-white">
                Category
              </label>

              <select
                {...register("category")}
                className="w-full rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] p-3 text-lg"
              >
                <option value="">Select category</option>
                <option value="food">Food</option>
                <option value="study">Study</option>
                <option value="sports">Sports</option>
                <option value="nightlife">Nightlife</option>
              </select>
            </div>

            <TextArea
              label=""
              name="description"
              placeholder="Add a description (optional)"
              rows={3}
              register={register}
              error={errors.description}
            />

            <button
              type="submit"
              disabled={isCreating}
              className="w-full rounded-xl bg-cyan-600 px-4 py-3 font-medium text-white transition hover:bg-cyan-500 disabled:opacity-70"
            >
              {isCreating ? "Creating..." : "Create Room"}
            </button>
          </form>


          {/* button to redirect to lobby. might need to be rewritten when backend done */}
            {roomCode && (
              <Link
                href={`/rooms/${roomCode}/lobby`}
                className="mt-5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 p-4 text-center text-white font-medium shadow-md hover:opacity-95 active:scale-[0.99] transition duration-200 flex justify-center items-center gap-2 group"
              >
                <span>Go to Room Lobby</span>
                <span className="group-hover:translate-x-1 transition-transform"></span>
              </Link>
            )}

        </div>

        {/* RIGHT SIDE */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-xl">


            <div className="flex flex-col gap-6 w-full max-w-md shrink-0">

                {/* image (separate box) */}
                <div className="rounded-xl bg-gray-200/75 dark:bg-gray-800/75 p-3 flex justify-center items-center aspect-square w-full overflow-hidden">
                    <img
                    src={IMAGES[currentImageIndex]}
                    className="w-full h-full object-cover rounded-lg transition-all duration-500"
                    alt="Room"
                    />
                </div>

                {/* display room code */}
                <div className="rounded-xl bg-gray-200/75 dark:bg-gray-800/75 p-6 flex flex-col items-center gap-4">
                    {roomCode ? (
                    <>
                        <p className="text-sm text-gray-500">Room Code</p>
                        <div className="w-full flex items-center justify-between bg-white dark:bg-black border px-4 py-3 rounded-xl">
                            <span className="font-mono text-xl font-bold tracking-wider text-cyan-600 dark:text-cyan-400">{roomCode}</span>
                            <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(roomCode)}
                                className="text-cyan-600 text-sm hover:underline"
                            >
                                Copy
                            </button>
                        </div>
                    </>
                    ) : (
                    <p className="text-sm text-gray-500 text-center">
                        Create a room to generate a code
                    </p>
                    )}
                </div>
                </div>
            </div>
        </div>
    </div>

  );
}