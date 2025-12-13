import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#06060a] flex items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#0c0c12] border border-white/10",
            headerTitle: "text-white",
            headerSubtitle: "text-white/60",
            socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10",
            formFieldLabel: "text-white/70",
            formFieldInput: "bg-white/5 border-white/10 text-white",
            footerActionLink: "text-violet-400 hover:text-violet-300",
          },
        }}
      />
    </div>
  );
}
