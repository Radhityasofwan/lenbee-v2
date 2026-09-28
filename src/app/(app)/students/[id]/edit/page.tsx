import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StudentForm } from "@/components/student/student-form";
import { requireTutor } from "@/lib/auth";
import { StudentError, getOwnedStudent } from "@/lib/services/students";

export default async function EditStudentPage(props: PageProps<"/students/[id]/edit">) {
  const user = await requireTutor();
  const { id } = await props.params;

  let student;
  try {
    student = await getOwnedStudent(user.id, Number(id));
  } catch (error) {
    if (error instanceof StudentError) notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Ubah murid" description={student.name} />
      <StudentForm student={student} />
    </div>
  );
}
