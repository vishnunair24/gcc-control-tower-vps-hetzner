import customerLogo from "../assets/customer-logo.png";

export default function Header() {
  return (
    <div className="flex items-center w-full">
      {/* LEFT: App Title */}
      <h1 className="text-xl font-medium tracking-tight text-gray-900">
        GCC Control Tower
      </h1>

      {/* RIGHT: Customer Logo (pushed to extreme right) */}
      <div className="flex items-center ml-auto pr-6 border-r border-gray-300">
        <img
          src={customerLogo}
          alt="Customer Logo"
          style={{
            height: "28px",
            objectFit: "contain",
            opacity: 0.95,
          }}
        />
      </div>
    </div>
  );
}