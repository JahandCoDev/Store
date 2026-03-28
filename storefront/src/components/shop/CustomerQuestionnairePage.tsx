import CustomerQuestionnaireForm from "@/components/shop/CustomerQuestionnaireForm";

export function CustomerQuestionnairePage({ store }: { store: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Style Survey</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">
          Answer a few questions so we can personalize your experience.
        </p>

        <div className="mt-10">
          <CustomerQuestionnaireForm store={store} />
        </div>
      </div>
    </div>
  );
}
