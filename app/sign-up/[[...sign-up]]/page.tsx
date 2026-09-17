import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <SignUp
        afterSignUpUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-surface border border-rim",
            headerTitle: "text-ink",
            headerSubtitle: "text-ink-muted",
            socialButtonsBlockButton: "bg-surface border-rim text-ink hover:bg-surface",
            formFieldLabel: "text-ink-muted",
            formFieldInput: "bg-surface border-rim text-ink",
            footerActionLink: "text-accent hover:text-accent",
          },
        }}
      />
    </div>
  );
}
