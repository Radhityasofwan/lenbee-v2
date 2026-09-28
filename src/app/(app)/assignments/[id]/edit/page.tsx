import { notFound } from "next/navigation";
import { AssignmentForm } from "@/components/assignment/assignment-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import { AssignmentError, getOwnedAssignment } from "@/lib/services/assignments";
import { listStudents, programsForStudent } from "@/lib/services/students";

export default async function EditAssignmentPage(props: PageProps<"/assignments/[id]/edit">) {
  const user = await requireTutor();
  const { id } = await props.params;

  let assignment;
  try {
    assignment = await getOwnedAssignment(user.id, Number(id));
  } catch (error) {
    if (error instanceof AssignmentError) notFound();
    throw error;
  }

  const [students, programs] = await Promise.all([
    listStudents(user.id, { includeInactive: true }),
    programsForStudent(assignment.studentId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Ubah tugas" description={assignment.title} />
      <AssignmentForm
        students={students.map((student) => ({ id: student.id, name: student.name, nickname: student.nickname }))}
        programs={programs.map((program) => ({
          id: program.id,
          name: program.name,
          studentId: program.studentId,
          studentName: students.find((student) => student.id === program.studentId)?.name ?? "",
        }))}
        assignment={assignment}
      />
    </div>
  );
}
