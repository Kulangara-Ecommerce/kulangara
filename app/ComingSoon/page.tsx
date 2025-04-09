import Image from "next/image";

export default function ComingSoon() {
  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-14 mx-4 md:mx-6 lg:mx-48">
      <div className="flex-1 flex flex-col gap-8 md:gap-12 lg:gap-32">
        <h1 className="text-lg md:text-xl font-normal uppercase tracking-[-1px]">
          Kulangara | Coming Soon
        </h1>
        <h2 className="max-w-[600px] text-4xl md:text-4xl lg:text-6xl font-normal tracking-[-2px] lg:tracking-[-4px]">
          bhubaneswar based fashion wear store with khanti{" "}
          <span className="font-['Noto_Sans_Oriya']">ଓଡ଼ିଆ</span> touch
        </h2>

        <div className="flex flex-row gap-4 md:gap-9 tracking-[-2px]">
          <a
            href="https://www.instagram.com/kulangara.in/"
            className="text-lg md:text-2xl underline hover:opacity-75 transition"
          >
            instagram
          </a>
          <a
            href="https://www.facebook.com/kulangara.in/"
            className="text-lg md:text-2xl underline hover:opacity-75 transition"
          >
            facebook
          </a>
          <a
            href="mailto:kulangara@gmail.com"
            className="text-lg md:text-2xl underline hover:opacity-75 transition"
          >
            kulangara@gmail.com
          </a>
        </div>
      </div>
      <div className="relative w-full md:w-[382px] aspect-[382/533]">
        <Image
          src="/images/coming-soon.jpg"
          alt="Kulangara Team"
          fill
          className="object-cover rounded-lg"
          priority
        />
      </div>{" "}
    </div>
  );
}
