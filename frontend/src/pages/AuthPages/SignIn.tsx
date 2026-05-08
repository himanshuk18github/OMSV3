import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Apni Stationery Dashboard | Apni Stationery - Admin Dashboard "
        description="This is OMS V3.0 - APNI STATIONERY - Admin Dashboard "
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
