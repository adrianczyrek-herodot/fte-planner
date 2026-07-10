import { requireApprovedUser } from "@/app/actions/auth";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AppDashboardPage() {
  const session = await requireApprovedUser();
  const user = session.user;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Witaj, {user.name}</h1>
        <p className="text-muted-foreground">
          Panel planowania FTE dla zespołu zarządzającego.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Twoje konto</CardTitle>
          <CardDescription>
            {user.email} · rola: {user.role === "admin" ? "administrator" : "użytkownik"}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
