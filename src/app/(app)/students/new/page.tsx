import { PageHeader } from "@/components/ui/page-header";
import { StudentForm } from "@/components/student/student-form";
import { requireTutor } from "@/lib/auth";

export default async function NewStudentPage() {
  await requireTutor();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Murid baru" description="Data ini dipakai untuk jadwal, laporan, dan tagihan." />
      <StudentForm />
    </div>
  );
}
