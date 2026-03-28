import CustomerQuestionnaireForm from "@/components/shop/CustomerQuestionnaireForm";

export function CustomerQuestionnairePage({ store }: { store: string }) {
  return (
    <div className="store-section py-8 sm:py-10">
      <div className="store-container max-w-3xl animate-fade-in">
        <div className="store-card px-6 py-8 sm:px-8 sm:py-10">
        <h1 className="store-title text-3xl font-semibold tracking-tight sm:text-4xl">Style Survey</h1>
        <p className="store-copy mt-4 text-sm leading-relaxed">
          Answer a few questions so we can personalize your experience.
        </p>

        <div className="mt-10">
          <CustomerQuestionnaireForm store={store} />
        </div>
        </div>
      </div>
    </div>
  );
}
