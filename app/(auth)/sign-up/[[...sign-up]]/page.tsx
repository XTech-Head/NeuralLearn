import { SignUp } from '@clerk/nextjs'


export default function SignUpPage() {
  return (
    <div className='flex min-h-screen w-full items-center justify-center bg-background p-4'>
    
      <SignUp 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#1a1a1a] border border-[#333] shadow-2xl",
            headerTitle: "text-[#00bfff] text-2xl font-semibold",
            headerSubtitle: "text-white/70 text-sm",
            socialButtonsBlockButton: "bg-[#333] border border-[#444] text-white hover:bg-[#404040] transition-colors",
            socialButtonsBlockButtonText: "text-white font-medium",
            formButtonPrimary: "bg-[#00bfff] hover:bg-[#00bfff96] text-white font-medium transition-colors shadow-lg",
            formFieldInput: "bg-[#333] border border-[#444] text-white placeholder:text-white/50 focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff] transition-all",
            formFieldLabel: "text-white/70 text-sm font-medium",
            footerActionLink: "text-[#00bfff] hover:text-[#00bfff96] font-medium",
            footerActionText: "text-white/70",
            identityPreviewText: "text-white",
            identityPreviewEditButton: "text-[#00bfff] hover:text-[#00bfff96]",
            formResendCodeLink: "text-[#00bfff] hover:text-[#00bfff96]",
            otpCodeFieldInput: "bg-[#333] border border-[#444] text-white focus:border-[#00bfff]",
            formFieldSuccessText: "text-green-400",
            formFieldErrorText: "text-red-400",
            formFieldHintText: "text-white/50 text-xs",
            dividerLine: "bg-[#444]",
            dividerText: "text-white/50",
            logoBox: "justify-center",
            logoImage: "brightness-0 invert",
            cardBox: "shadow-xl",
            footer: "bg-transparent",
            navbar: "bg-transparent",
            navbarButton: "text-white/70 hover:text-white",
            pageScrollBox: "bg-transparent"
          },
          layout: {
            socialButtonsPlacement: 'bottom',
            socialButtonsVariant: 'blockButton',
            shimmer: true,
          },
          variables: {
            colorPrimary: '#00bfff',
            colorText: '#ffffff',
            colorBackground: '#1a1a1a',
            colorInputBackground: '#333333',
            colorInputText: '#ffffff',
            borderRadius: '0.75rem',
            fontFamily: 'inherit'
          }
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
      />
    </div>
  );
}
