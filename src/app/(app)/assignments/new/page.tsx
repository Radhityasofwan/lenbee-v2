import { AssignmentForm } from "@/components/assignment/assignment-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import { activeProgramsForTutor, listStudents } from "@/lib/services/students";

export default async function NewAssignmentPage() {
  const user = await requireTutor();
  const [students, programs] = await Promise.all([
    listStudents(user.id),
    activeProgramsForTutor(user.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tugas baru"
        description="Buat tugas lalu isi soalnya. Soal bisa ditulis manual atau dibuat dengan AI."
      />
      <AssignmentForm
        students={students.map((student) => ({ id: student.id, name: student.name, nickname: student.nickname }))}
        programs={programs.map((program) => ({
          id: program.id,
          name: program.name,
          studentId: program.studentId,
          studentName: program.studentName,
        }))}
      />
    </div>
  );
}
