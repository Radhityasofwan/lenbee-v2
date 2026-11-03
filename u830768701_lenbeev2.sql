-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Waktu pembuatan: 02 Nov 2026 pada 19.28
-- Versi server: 11.8.9-MariaDB-log
-- Versi PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u830768701_lenbeev2`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `ai_api_keys`
--

CREATE TABLE `ai_api_keys` (
  `id` int(11) NOT NULL,
  `alias` varchar(120) NOT NULL,
  `provider` enum('9router','google','openrouter') NOT NULL,
  `api_key_encrypted` text NOT NULL,
  `key_hint` varchar(16) DEFAULT NULL,
  `base_url` varchar(300) DEFAULT NULL,
  `model_allowed` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`model_allowed`)),
  `priority` int(11) NOT NULL DEFAULT 100,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `health_status` enum('healthy','cooldown','disabled') NOT NULL DEFAULT 'healthy',
  `cooldown_until` timestamp NULL DEFAULT NULL,
  `last_health_check` timestamp NULL DEFAULT NULL,
  `last_error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `ai_chat_messages`
--

CREATE TABLE `ai_chat_messages` (
  `id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `role` enum('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `attachment_document_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachment_document_ids`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `ai_chat_sessions`
--

CREATE TABLE `ai_chat_sessions` (
  `id` int(11) NOT NULL,
  `tutor_id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL DEFAULT 'Percakapan baru',
  `state` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`state`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `ai_generations`
--

CREATE TABLE `ai_generations` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `kind` varchar(60) NOT NULL,
  `provider` varchar(60) NOT NULL,
  `model` varchar(120) DEFAULT NULL,
  `ok` tinyint(1) NOT NULL DEFAULT 1,
  `error_message` text DEFAULT NULL,
  `prompt_chars` int(11) NOT NULL DEFAULT 0,
  `output_chars` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `ai_models`
--

CREATE TABLE `ai_models` (
  `id` int(11) NOT NULL,
  `provider` enum('9router','google','openrouter') NOT NULL,
  `model_id` varchar(191) NOT NULL,
  `name` varchar(200) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `synced_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `assignments`
--

CREATE TABLE `assignments` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `program_id` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `material` varchar(200) DEFAULT NULL,
  `instructions` text DEFAULT NULL,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
  `ai_generated` tinyint(1) NOT NULL DEFAULT 0,
  `created_by_user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `public_token` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `assignment_attempts`
--

CREATE TABLE `assignment_attempts` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `status` enum('in_progress','submitted','graded') NOT NULL DEFAULT 'in_progress',
  `score` int(11) DEFAULT NULL,
  `max_score` int(11) NOT NULL DEFAULT 0,
  `started_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `submitted_at` timestamp NULL DEFAULT NULL,
  `graded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `attempt_answers`
--

CREATE TABLE `attempt_answers` (
  `id` int(11) NOT NULL,
  `attempt_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `answer` text DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `points_awarded` int(11) NOT NULL DEFAULT 0,
  `feedback` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `auth_sessions`
--

CREATE TABLE `auth_sessions` (
  `id` varchar(64) NOT NULL,
  `user_id` int(11) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `auth_sessions`
--

INSERT INTO `auth_sessions` (`id`, `user_id`, `expires_at`, `user_agent`, `ip`, `created_at`) VALUES
('190f20ef2b2099b6b978dbffa7b5ebfb8936c9980c659a55c4cd620546f5dc95', 1, '2026-10-30 02:38:46', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36', '103.26.188.5', '2026-09-30 02:38:46'),
('40ce0420844286b0474513204f3499cbce48905bafa7cdb5fe4a6838854b7abe', 2, '2026-10-30 02:08:59', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7.5 Mobile/15E148 Safari/604.1', '103.26.188.5', '2026-09-30 02:08:59'),
('631df10f84f80cee151272b04af054a0cf8e336b43b55fa03d0d1dab7d6643f3', 1, '2026-10-29 00:37:42', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36', '103.26.188.5', '2026-09-29 00:37:42'),
('65f557554aef9a5da833af0b9cea738ed543545b032df4911fe7f28ac0c38ced', 2, '2026-10-30 01:39:55', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36', '103.26.188.5', '2026-09-30 01:39:55'),
('8843a0e82585a01e7537e5005cee77dd718b96a6a8cfde24f6641c6c04d9c45b', 1, '2026-10-29 13:39:11', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1', '103.26.188.5', '2026-09-29 13:39:11');

-- --------------------------------------------------------

--
-- Struktur dari tabel `bank_questions`
--

CREATE TABLE `bank_questions` (
  `id` int(11) NOT NULL,
  `tutor_id` int(11) NOT NULL,
  `subject` varchar(120) NOT NULL,
  `grade` varchar(60) DEFAULT NULL,
  `material` varchar(200) NOT NULL,
  `type` enum('multiple_choice','short_answer','essay') NOT NULL,
  `prompt` text NOT NULL,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `correct_answer` text DEFAULT NULL,
  `points` int(11) NOT NULL DEFAULT 1,
  `explanation` text DEFAULT NULL,
  `difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
  `usage_count` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `student_id` int(11) DEFAULT NULL,
  `program_id` int(11) DEFAULT NULL,
  `lesson_id` int(11) DEFAULT NULL,
  `material_tag` varchar(160) DEFAULT NULL,
  `category` enum('worksheet','exercise','summary','material','school','other') NOT NULL DEFAULT 'other',
  `storage_key` varchar(500) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(120) NOT NULL,
  `size` bigint(20) NOT NULL,
  `uploaded_by_user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `documents`
--

INSERT INTO `documents` (`id`, `title`, `description`, `student_id`, `program_id`, `lesson_id`, `material_tag`, `category`, `storage_key`, `original_name`, `mime_type`, `size`, `uploaded_by_user_id`, `created_at`) VALUES
(1, 'Soal STS Pancasila', NULL, 1, 2, NULL, NULL, 'exercise', 'documents/1/f594d2fe-242d-4d9b-aab4-9969aa5cc632.docx', 'STS_Pendidikan_Pancasila_Kelas_3_Bab_1.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 39228, 1, '2026-09-30 02:46:29');

-- --------------------------------------------------------

--
-- Struktur dari tabel `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `invoice_number` varchar(40) NOT NULL,
  `student_id` int(11) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `issue_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('unpaid','partial','paid','void') NOT NULL DEFAULT 'unpaid',
  `subtotal` int(11) NOT NULL DEFAULT 0,
  `discount` int(11) NOT NULL DEFAULT 0,
  `total` int(11) NOT NULL DEFAULT 0,
  `paid_amount` int(11) NOT NULL DEFAULT 0,
  `paid_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `public_token` varchar(64) NOT NULL,
  `created_by_user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `invoice_items`
--

CREATE TABLE `invoice_items` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `lesson_id` int(11) DEFAULT NULL,
  `program_id` int(11) DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` int(11) NOT NULL DEFAULT 0,
  `amount` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `lesson_attachments`
--

CREATE TABLE `lesson_attachments` (
  `id` int(11) NOT NULL,
  `lesson_id` int(11) NOT NULL,
  `storage_key` varchar(500) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(120) NOT NULL,
  `size` bigint(20) NOT NULL,
  `kind` enum('image','document') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `lesson_sessions`
--

CREATE TABLE `lesson_sessions` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL,
  `schedule_id` int(11) DEFAULT NULL,
  `tutor_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `duration_minutes` int(11) NOT NULL DEFAULT 60,
  `status` enum('scheduled','completed','cancelled','moved') NOT NULL DEFAULT 'scheduled',
  `attendance` enum('present','absent') NOT NULL DEFAULT 'present',
  `cancel_reason` enum('cancelled','student_absent','tutor_absent','holiday') DEFAULT NULL,
  `is_billable` tinyint(1) NOT NULL DEFAULT 1,
  `focus` enum('routine','review','exam_prep','homework','remedial','other') NOT NULL DEFAULT 'routine',
  `topic_label` varchar(160) DEFAULT NULL,
  `material` text DEFAULT NULL,
  `activities` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `report_text` text DEFAULT NULL,
  `report_status` enum('none','draft','final') NOT NULL DEFAULT 'none',
  `report_generated_by` enum('manual','ai') DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `invoice_id` int(11) DEFAULT NULL,
  `moved_from_id` int(11) DEFAULT NULL,
  `moved_to_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `lesson_sessions`
--

INSERT INTO `lesson_sessions` (`id`, `student_id`, `program_id`, `schedule_id`, `tutor_id`, `date`, `start_time`, `end_time`, `duration_minutes`, `status`, `attendance`, `cancel_reason`, `is_billable`, `focus`, `topic_label`, `material`, `activities`, `notes`, `report_text`, `report_status`, `report_generated_by`, `completed_at`, `invoice_id`, `moved_from_id`, `moved_to_id`, `created_at`, `updated_at`) VALUES
(1, 3, 4, 1, 1, '2026-10-05', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 00:35:24', '2026-09-29 00:35:24'),
(2, 3, 4, 1, 1, '2026-10-12', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 00:35:24', '2026-09-29 00:35:24'),
(3, 3, 4, 1, 1, '2026-10-19', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 00:35:24', '2026-09-29 00:35:24'),
(4, 3, 4, 1, 1, '2026-10-26', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 00:35:24', '2026-09-29 00:35:24'),
(5, 3, 4, 1, 1, '2026-11-02', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 00:35:24', '2026-09-29 00:35:24'),
(6, 3, 4, 1, 1, '2026-11-09', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 00:35:24', '2026-09-29 00:35:24'),
(7, 3, 4, 1, 1, '2026-11-16', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 00:35:24', '2026-09-29 00:35:24'),
(8, 3, 4, 1, 1, '2026-11-23', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 00:35:24', '2026-09-29 00:35:24'),
(121, 3, 4, 2, 1, '2026-10-02', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 14:01:23', '2026-09-29 14:01:23'),
(122, 3, 4, 2, 1, '2026-10-09', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 14:01:23', '2026-09-29 14:01:23'),
(123, 3, 4, 2, 1, '2026-10-16', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 14:01:23', '2026-09-29 14:01:23'),
(124, 3, 4, 2, 1, '2026-10-23', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 14:01:23', '2026-09-29 14:01:23'),
(125, 3, 4, 2, 1, '2026-10-30', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 14:01:23', '2026-09-29 14:01:23'),
(126, 3, 4, 2, 1, '2026-11-06', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 14:01:23', '2026-09-29 14:01:23'),
(127, 3, 4, 2, 1, '2026-11-13', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 14:01:23', '2026-09-29 14:01:23'),
(128, 3, 4, 2, 1, '2026-11-20', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 14:01:23', '2026-09-29 14:01:23'),
(129, 3, 4, 2, 1, '2026-11-27', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-29 14:01:23', '2026-09-29 14:01:23'),
(291, 1, 2, 3, 1, '2026-10-12', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:22:35', '2026-09-30 02:22:35'),
(292, 1, 2, 3, 1, '2026-10-19', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:22:35', '2026-09-30 02:22:35'),
(293, 1, 2, 3, 1, '2026-10-26', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:22:35', '2026-09-30 02:22:35'),
(294, 1, 2, 3, 1, '2026-11-02', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:22:35', '2026-09-30 02:22:35'),
(295, 1, 2, 3, 1, '2026-11-09', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:22:35', '2026-09-30 02:22:35'),
(296, 1, 2, 3, 1, '2026-11-16', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:22:35', '2026-09-30 02:22:35'),
(297, 1, 2, 3, 1, '2026-11-23', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:22:35', '2026-09-30 02:22:35'),
(384, 1, 3, 6, 1, '2026-10-16', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:24:44', '2026-09-30 02:24:44'),
(385, 1, 3, 6, 1, '2026-10-23', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:24:44', '2026-09-30 02:24:44'),
(386, 1, 3, 6, 1, '2026-10-30', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:24:44', '2026-09-30 02:24:44'),
(387, 1, 3, 6, 1, '2026-11-06', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:24:44', '2026-09-30 02:24:44'),
(388, 1, 3, 6, 1, '2026-11-13', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:24:44', '2026-09-30 02:24:44'),
(389, 1, 3, 6, 1, '2026-11-20', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:24:44', '2026-09-30 02:24:44'),
(390, 1, 3, 6, 1, '2026-11-27', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:24:44', '2026-09-30 02:24:44'),
(520, 2, 1, 8, 1, '2026-09-24', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:25:53', '2026-09-30 02:25:53'),
(2682, 2, 1, 8, 1, '2026-10-01', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:29:36', '2026-09-30 02:29:36'),
(2683, 2, 1, 8, 1, '2026-10-08', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:29:36', '2026-09-30 02:29:36'),
(2684, 2, 1, 8, 1, '2026-10-15', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:29:36', '2026-09-30 02:29:36'),
(2685, 2, 1, 8, 1, '2026-10-22', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:29:36', '2026-09-30 02:29:36'),
(2686, 2, 1, 8, 1, '2026-10-29', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:29:36', '2026-09-30 02:29:36'),
(2687, 2, 1, 8, 1, '2026-11-05', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:29:36', '2026-09-30 02:29:36'),
(2688, 2, 1, 8, 1, '2026-11-12', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:29:36', '2026-09-30 02:29:36'),
(2689, 2, 1, 8, 1, '2026-11-19', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:29:36', '2026-09-30 02:29:36'),
(2690, 2, 1, 8, 1, '2026-11-26', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:29:36', '2026-09-30 02:29:36'),
(6588, 1, 2, 9, 1, '2026-10-13', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:34:49', '2026-09-30 02:34:49'),
(6589, 1, 2, 9, 1, '2026-10-20', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:34:49', '2026-09-30 02:34:49'),
(6590, 1, 2, 9, 1, '2026-10-27', '14:00:00', '15:30:00', 90, 'completed', 'present', NULL, 1, 'routine', 'Matematika', '- pengukuran berat dengan satuan gram\r\n- menghafal susunan tangga satuan berat (kg,hg,dah dll)\r\n- cara mengubah satuan berat \r\n- mengerjakan latihan soal', NULL, NULL, 'Pada sesi Pelajaran umum Selasa, 27 Oktober 2026 (14:00–15:30), Alliando belajar Matematika dengan fokus materi rutin. Materi yang dibahas: - pengukuran berat dengan satuan gram\r\n- menghafal susunan tangga satuan berat (kg,hg,dah dll)\r\n- cara mengubah satuan berat \r\n- mengerjakan latihan soal.', 'final', 'manual', '2026-10-28 05:29:38', NULL, NULL, NULL, '2026-09-30 02:34:49', '2026-10-28 05:29:51'),
(6591, 1, 2, 9, 1, '2026-11-03', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:34:49', '2026-09-30 02:34:49'),
(6592, 1, 2, 9, 1, '2026-11-10', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:34:49', '2026-09-30 02:34:49'),
(6593, 1, 2, 9, 1, '2026-11-17', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:34:49', '2026-09-30 02:34:49'),
(6594, 1, 2, 9, 1, '2026-11-24', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:34:49', '2026-09-30 02:34:49'),
(6833, 1, 2, 10, 1, '2026-10-14', '15:30:00', '17:00:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:35:24', '2026-09-30 02:35:24'),
(6834, 1, 2, 10, 1, '2026-10-21', '15:30:00', '17:00:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:35:24', '2026-09-30 02:35:24'),
(6835, 1, 2, 10, 1, '2026-10-28', '15:30:00', '17:00:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:35:24', '2026-09-30 02:35:24'),
(6836, 1, 2, 10, 1, '2026-11-04', '15:30:00', '17:00:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:35:24', '2026-09-30 02:35:24'),
(6837, 1, 2, 10, 1, '2026-11-11', '15:30:00', '17:00:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:35:24', '2026-09-30 02:35:24'),
(6838, 1, 2, 10, 1, '2026-11-18', '15:30:00', '17:00:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:35:24', '2026-09-30 02:35:24'),
(6839, 1, 2, 10, 1, '2026-11-25', '15:30:00', '17:00:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:35:24', '2026-09-30 02:35:24'),
(9898, 2, 1, 11, 1, '2026-09-29', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:39:06', '2026-09-30 02:39:06'),
(9899, 2, 1, 11, 1, '2026-10-06', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:39:06', '2026-09-30 02:39:06'),
(9900, 2, 1, 11, 1, '2026-10-13', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:39:06', '2026-09-30 02:39:06'),
(9901, 2, 1, 11, 1, '2026-10-20', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:39:06', '2026-09-30 02:39:06'),
(9902, 2, 1, 11, 1, '2026-10-27', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:39:06', '2026-09-30 02:39:06'),
(9903, 2, 1, 11, 1, '2026-11-03', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:39:06', '2026-09-30 02:39:06'),
(9904, 2, 1, 11, 1, '2026-11-10', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:39:06', '2026-09-30 02:39:06'),
(9905, 2, 1, 11, 1, '2026-11-17', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:39:06', '2026-09-30 02:39:06'),
(9906, 2, 1, 11, 1, '2026-11-24', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:39:06', '2026-09-30 02:39:06'),
(14954, 4, 5, 12, 1, '2026-10-06', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:10', '2026-09-30 02:42:10'),
(14955, 4, 5, 12, 1, '2026-10-13', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:10', '2026-09-30 02:42:10'),
(14956, 4, 5, 12, 1, '2026-10-20', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:10', '2026-09-30 02:42:10'),
(14957, 4, 5, 12, 1, '2026-10-27', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:10', '2026-09-30 02:42:10'),
(14958, 4, 5, 12, 1, '2026-11-03', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:10', '2026-09-30 02:42:10'),
(14959, 4, 5, 12, 1, '2026-11-10', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:10', '2026-09-30 02:42:10'),
(14960, 4, 5, 12, 1, '2026-11-17', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:10', '2026-09-30 02:42:10'),
(14961, 4, 5, 12, 1, '2026-11-24', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:10', '2026-09-30 02:42:10'),
(15026, 4, 5, 13, 1, '2026-10-07', '17:00:00', '18:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:23', '2026-09-30 02:42:23'),
(15027, 4, 5, 13, 1, '2026-10-14', '17:00:00', '18:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:23', '2026-09-30 02:42:23'),
(15028, 4, 5, 13, 1, '2026-10-21', '17:00:00', '18:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:23', '2026-09-30 02:42:23'),
(15029, 4, 5, 13, 1, '2026-10-28', '17:00:00', '18:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:23', '2026-09-30 02:42:23'),
(15030, 4, 5, 13, 1, '2026-11-04', '17:00:00', '18:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:23', '2026-09-30 02:42:23'),
(15031, 4, 5, 13, 1, '2026-11-11', '17:00:00', '18:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:23', '2026-09-30 02:42:23'),
(15032, 4, 5, 13, 1, '2026-11-18', '17:00:00', '18:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:23', '2026-09-30 02:42:23'),
(15033, 4, 5, 13, 1, '2026-11-25', '17:00:00', '18:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-09-30 02:42:23', '2026-09-30 02:42:23'),
(16386, 3, 4, 1, 1, '2026-11-30', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-02 13:18:20', '2026-10-02 13:18:20'),
(16387, 1, 2, 3, 1, '2026-11-30', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-02 13:18:20', '2026-10-02 13:18:20'),
(16388, 1, 2, 9, 1, '2026-12-01', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-02 13:18:20', '2026-10-02 13:18:20'),
(16389, 2, 1, 11, 1, '2026-12-01', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-02 13:18:20', '2026-10-02 13:18:20'),
(16390, 4, 5, 12, 1, '2026-12-01', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-02 13:18:20', '2026-10-02 13:18:20'),
(16727, 3, 4, 1, 1, '2026-12-07', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16728, 3, 4, 1, 1, '2026-12-14', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16729, 3, 4, 1, 1, '2026-12-21', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16730, 3, 4, 2, 1, '2026-12-04', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16731, 3, 4, 2, 1, '2026-12-11', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16732, 3, 4, 2, 1, '2026-12-18', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16733, 3, 4, 2, 1, '2026-12-25', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16734, 1, 2, 3, 1, '2026-12-07', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16735, 1, 2, 3, 1, '2026-12-14', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16736, 1, 2, 3, 1, '2026-12-21', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16737, 1, 3, 6, 1, '2026-12-04', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16738, 1, 3, 6, 1, '2026-12-11', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16739, 1, 3, 6, 1, '2026-12-18', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16740, 1, 3, 6, 1, '2026-12-25', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16741, 2, 1, 8, 1, '2026-12-03', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16742, 2, 1, 8, 1, '2026-12-10', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16743, 2, 1, 8, 1, '2026-12-17', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16744, 2, 1, 8, 1, '2026-12-24', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16745, 1, 2, 9, 1, '2026-12-08', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16746, 1, 2, 9, 1, '2026-12-15', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16747, 1, 2, 9, 1, '2026-12-22', '14:00:00', '15:30:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16748, 1, 2, 10, 1, '2026-12-02', '15:30:00', '17:00:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16749, 1, 2, 10, 1, '2026-12-09', '15:30:00', '17:00:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16750, 1, 2, 10, 1, '2026-12-16', '15:30:00', '17:00:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16751, 1, 2, 10, 1, '2026-12-23', '15:30:00', '17:00:00', 90, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16752, 2, 1, 11, 1, '2026-12-08', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16753, 2, 1, 11, 1, '2026-12-15', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16754, 2, 1, 11, 1, '2026-12-22', '12:00:00', '13:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16755, 4, 5, 12, 1, '2026-12-08', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16756, 4, 5, 12, 1, '2026-12-15', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16757, 4, 5, 12, 1, '2026-12-22', '16:00:00', '17:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16758, 4, 5, 13, 1, '2026-12-02', '17:00:00', '18:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16759, 4, 5, 13, 1, '2026-12-09', '17:00:00', '18:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16760, 4, 5, 13, 1, '2026-12-16', '17:00:00', '18:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16761, 4, 5, 13, 1, '2026-12-23', '17:00:00', '18:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:17:57', '2026-10-28 05:17:57'),
(16847, 5, 6, 14, 1, '2026-10-20', '13:30:00', '14:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:14', '2026-10-28 05:21:14'),
(16848, 5, 6, 14, 1, '2026-10-27', '13:30:00', '14:30:00', 60, 'completed', 'present', NULL, 1, 'routine', 'Membaca dan menulis', 'Membaca buku abacaga bagian \"ba,ca,ga,ja,da\" \r\nMenulis huruf kapital D dan huruf kecil d\r\nBelajar membaca beberapa suku kata seperti mami papi mama papa bobo dede \r\nMenulis nama Delisha, mami dan papi sendiri', NULL, NULL, 'Pada sesi Calistung Selasa, 27 Oktober 2026 (13:30–14:30), Delisha belajar Membaca dan menulis dengan fokus materi rutin. Materi yang dibahas: Membaca buku abacaga bagian \"ba,ca,ga,ja,da\" \r\nMenulis huruf kapital D dan huruf kecil d\r\nBelajar membaca beberapa suku kata seperti mami papi mama papa bobo dede \r\nMenulis nama Delisha, mami dan papi sendiri.', 'final', 'manual', '2026-10-28 05:27:30', NULL, NULL, NULL, '2026-10-28 05:21:14', '2026-10-28 05:27:30'),
(16849, 5, 6, 14, 1, '2026-11-03', '13:30:00', '14:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:14', '2026-10-28 05:21:14'),
(16850, 5, 6, 14, 1, '2026-11-10', '13:30:00', '14:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:14', '2026-10-28 05:21:14'),
(16851, 5, 6, 14, 1, '2026-11-17', '13:30:00', '14:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:14', '2026-10-28 05:21:14'),
(16852, 5, 6, 14, 1, '2026-11-24', '13:30:00', '14:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:14', '2026-10-28 05:21:14'),
(16853, 5, 6, 14, 1, '2026-12-01', '13:30:00', '14:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:14', '2026-10-28 05:21:14'),
(16854, 5, 6, 14, 1, '2026-12-08', '13:30:00', '14:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:14', '2026-10-28 05:21:14'),
(16855, 5, 6, 14, 1, '2026-12-15', '13:30:00', '14:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:14', '2026-10-28 05:21:14'),
(16856, 5, 6, 14, 1, '2026-12-22', '13:30:00', '14:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:14', '2026-10-28 05:21:14'),
(16977, 5, 6, 15, 1, '2026-10-21', '14:30:00', '15:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:40', '2026-10-28 05:21:40'),
(16978, 5, 6, 15, 1, '2026-10-28', '14:30:00', '15:30:00', 60, 'completed', 'present', NULL, 1, 'routine', 'Belajar membaca dan menulis', 'Membaca buku abacaga bagian \"ba,ca,ga,ja,da\" \r\nMenulis huruf kapital D dan huruf kecil d\r\nBelajar membaca beberapa suku kata seperti mami papi mama papa bobo dede \r\nMenulis nama Delisha sendiri', NULL, NULL, 'Pada sesi Calistung Rabu, 28 Oktober 2026 (14:30–15:30), Delisha belajar Belajar membaca dan menulis dengan fokus materi rutin. Materi yang dibahas: Membaca buku abacaga bagian \"ba,ca,ga,ja,da\" \r\nMenulis huruf kapital D dan huruf kecil d\r\nBelajar membaca beberapa suku kata seperti mami papi mama papa bobo dede \r\nMenulis nama Delisha sendiri.', 'final', 'manual', '2026-10-28 05:26:01', NULL, NULL, NULL, '2026-10-28 05:21:40', '2026-10-28 05:26:01'),
(16979, 5, 6, 15, 1, '2026-11-04', '14:30:00', '15:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:40', '2026-10-28 05:21:40'),
(16980, 5, 6, 15, 1, '2026-11-11', '14:30:00', '15:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:40', '2026-10-28 05:21:40'),
(16981, 5, 6, 15, 1, '2026-11-18', '14:30:00', '15:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:40', '2026-10-28 05:21:40'),
(16982, 5, 6, 15, 1, '2026-11-25', '14:30:00', '15:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:40', '2026-10-28 05:21:40'),
(16983, 5, 6, 15, 1, '2026-12-02', '14:30:00', '15:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:40', '2026-10-28 05:21:40'),
(16984, 5, 6, 15, 1, '2026-12-09', '14:30:00', '15:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:40', '2026-10-28 05:21:40'),
(16985, 5, 6, 15, 1, '2026-12-16', '14:30:00', '15:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:40', '2026-10-28 05:21:40'),
(16986, 5, 6, 15, 1, '2026-12-23', '14:30:00', '15:30:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:40', '2026-10-28 05:21:40'),
(17117, 5, 6, 16, 1, '2026-10-16', '14:00:00', '15:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:56', '2026-10-28 05:21:56'),
(17118, 5, 6, 16, 1, '2026-10-23', '14:00:00', '15:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:56', '2026-10-28 05:21:56'),
(17119, 5, 6, 16, 1, '2026-10-30', '14:00:00', '15:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:56', '2026-10-28 05:21:56'),
(17120, 5, 6, 16, 1, '2026-11-06', '14:00:00', '15:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:56', '2026-10-28 05:21:56'),
(17121, 5, 6, 16, 1, '2026-11-13', '14:00:00', '15:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:56', '2026-10-28 05:21:56'),
(17122, 5, 6, 16, 1, '2026-11-20', '14:00:00', '15:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:56', '2026-10-28 05:21:56'),
(17123, 5, 6, 16, 1, '2026-11-27', '14:00:00', '15:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:56', '2026-10-28 05:21:56'),
(17124, 5, 6, 16, 1, '2026-12-04', '14:00:00', '15:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:56', '2026-10-28 05:21:56'),
(17125, 5, 6, 16, 1, '2026-12-11', '14:00:00', '15:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:56', '2026-10-28 05:21:56'),
(17126, 5, 6, 16, 1, '2026-12-18', '14:00:00', '15:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:56', '2026-10-28 05:21:56'),
(17127, 5, 6, 16, 1, '2026-12-25', '14:00:00', '15:00:00', 60, 'scheduled', 'present', NULL, 1, 'routine', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, NULL, NULL, NULL, '2026-10-28 05:21:56', '2026-10-28 05:21:56');

-- --------------------------------------------------------

--
-- Struktur dari tabel `login_attempts`
--

CREATE TABLE `login_attempts` (
  `id` int(11) NOT NULL,
  `identifier` varchar(191) NOT NULL,
  `success` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `login_attempts`
--

INSERT INTO `login_attempts` (`id`, `identifier`, `success`, `created_at`) VALUES
(1, 'annisayunr@gmail.com', 1, '2026-09-29 00:09:48'),
(2, 'annisayunr@gmail.com', 1, '2026-09-29 00:37:42'),
(3, 'annisayunr@gmail.com', 1, '2026-09-29 13:38:50'),
(4, 'annisayunr@gmail.com', 1, '2026-09-29 13:39:11'),
(5, 'annisayunr@gmail.com', 1, '2026-09-29 23:55:08'),
(6, 'admin@lenbee.id', 1, '2026-09-30 01:39:55'),
(7, 'admin@lenbee.id', 1, '2026-09-30 02:08:59'),
(8, 'annisayunr@gmail.com', 1, '2026-09-30 02:38:46'),
(9, 'teacher@lenbee.com', 0, '2026-11-02 00:09:07'),
(10, 'teacher@lenbee.com', 0, '2026-11-02 00:09:22'),
(11, 'teacher@lenbee.com', 0, '2026-11-02 00:10:02'),
(12, 'teacher@lenbee.com', 0, '2026-11-02 00:10:23'),
(13, 'admin@lenbee.com', 0, '2026-11-02 00:10:50'),
(14, 'aliando@lenbee.com', 0, '2026-11-02 00:11:17'),
(15, 'teacher@lenbee.com', 0, '2026-11-02 00:11:28'),
(16, 'admin@lenbee.com', 0, '2026-11-02 00:12:09');

-- --------------------------------------------------------

--
-- Struktur dari tabel `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('lesson_today','report_pending','invoice_unpaid','assignment_submitted','info') NOT NULL DEFAULT 'info',
  `title` varchar(200) NOT NULL,
  `body` text DEFAULT NULL,
  `link` varchar(300) DEFAULT NULL,
  `dedupe_key` varchar(191) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `body`, `link`, `dedupe_key`, `is_read`, `created_at`) VALUES
(1, 1, 'lesson_today', 'Mengajar hari ini: Alliando', 'Pukul 15:30', '/lessons/6835', 'lesson_today:6835', 0, '2026-10-28 05:26:01'),
(2, 1, 'lesson_today', 'Mengajar hari ini: Latisya', 'Pukul 17:00', '/lessons/15029', 'lesson_today:15029', 0, '2026-10-28 05:26:01'),
(9, 1, 'report_pending', 'Laporan belum diisi: Alliando Fatih Hamizan', 'Pertemuan 27 Okt', '/lessons/6590', 'report_pending:6590', 0, '2026-10-28 05:29:38');

-- --------------------------------------------------------

--
-- Struktur dari tabel `parent_invites`
--

CREATE TABLE `parent_invites` (
  `id` int(11) NOT NULL,
  `token` varchar(64) NOT NULL,
  `email` varchar(191) NOT NULL,
  `name` varchar(120) NOT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `student_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`student_ids`)),
  `expires_at` timestamp NOT NULL,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `created_by_user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `parent_students`
--

CREATE TABLE `parent_students` (
  `id` int(11) NOT NULL,
  `parent_user_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `relation` varchar(40) NOT NULL DEFAULT 'orang tua',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `parent_updates`
--

CREATE TABLE `parent_updates` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `body` text NOT NULL,
  `status` enum('draft','final','sent') NOT NULL DEFAULT 'draft',
  `ai_generated` tinyint(1) NOT NULL DEFAULT 0,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_by_user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `kind` enum('weekly','monthly','brief','daily','custom') NOT NULL DEFAULT 'weekly',
  `format` enum('narrative','checklist') NOT NULL DEFAULT 'narrative'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `programs`
--

CREATE TABLE `programs` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `subject` varchar(120) DEFAULT NULL,
  `color` varchar(20) NOT NULL DEFAULT 'sky',
  `rate` int(11) NOT NULL DEFAULT 0,
  `rate_unit` enum('per_session','per_hour') NOT NULL DEFAULT 'per_session',
  `default_duration_minutes` int(11) NOT NULL DEFAULT 60,
  `sessions_per_month` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `programs`
--

INSERT INTO `programs` (`id`, `student_id`, `name`, `subject`, `color`, `rate`, `rate_unit`, `default_duration_minutes`, `sessions_per_month`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 2, 'English', 'English', 'sky', 75000, 'per_hour', 60, NULL, NULL, 1, '2026-09-29 00:20:39', '2026-09-29 00:20:39'),
(2, 1, 'Pelajaran umum', 'Semua mapel', 'sky', 75000, 'per_session', 90, NULL, NULL, 1, '2026-09-29 00:28:13', '2026-09-29 00:28:13'),
(3, 1, 'Mengaji', 'Iqro, hafalan, menulis', 'sky', 75000, 'per_session', 90, NULL, NULL, 1, '2026-09-29 00:30:26', '2026-09-29 00:30:26'),
(4, 3, 'Pelajaran umum', 'Matematika', 'sky', 50000, 'per_hour', 60, NULL, NULL, 1, '2026-09-29 00:32:48', '2026-09-29 00:32:48'),
(5, 4, 'Pra sekolah', 'Pra sekolah', 'sky', 50000, 'per_hour', 60, NULL, NULL, 1, '2026-09-29 14:00:50', '2026-09-29 14:00:50'),
(6, 5, 'Calistung', 'Calistung', 'sky', 50000, 'per_hour', 60, NULL, NULL, 1, '2026-10-28 05:20:30', '2026-10-28 05:20:30'),
(7, 5, 'Mengaji', 'Mengaji', 'sky', 50000, 'per_session', 60, NULL, NULL, 1, '2026-10-28 05:22:25', '2026-10-28 05:22:25');

-- --------------------------------------------------------

--
-- Struktur dari tabel `push_subscriptions`
--

CREATE TABLE `push_subscriptions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `endpoint` varchar(500) NOT NULL,
  `p256dh` text NOT NULL,
  `auth` text NOT NULL,
  `user_agent` varchar(300) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_seen_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `questions`
--

CREATE TABLE `questions` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `type` enum('multiple_choice','short_answer','essay') NOT NULL,
  `prompt` text NOT NULL,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`options`)),
  `correct_answer` text DEFAULT NULL,
  `points` int(11) NOT NULL DEFAULT 1,
  `explanation` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `report_check_items`
--

CREATE TABLE `report_check_items` (
  `id` int(11) NOT NULL,
  `update_id` int(11) NOT NULL,
  `label` varchar(160) NOT NULL,
  `checked` tinyint(1) NOT NULL DEFAULT 0,
  `reason` enum('sudah_mampu','dengan_bantuan','perlu_dilatih') DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `schedules`
--

CREATE TABLE `schedules` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `program_id` int(11) NOT NULL,
  `day_of_week` int(11) NOT NULL,
  `start_time` time NOT NULL,
  `duration_minutes` int(11) NOT NULL DEFAULT 60,
  `frequency` enum('weekly','biweekly') NOT NULL DEFAULT 'weekly',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `location` varchar(160) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `schedules`
--

INSERT INTO `schedules` (`id`, `student_id`, `program_id`, `day_of_week`, `start_time`, `duration_minutes`, `frequency`, `start_date`, `end_date`, `location`, `is_active`, `notes`, `created_at`, `updated_at`) VALUES
(1, 3, 4, 1, '16:00:00', 60, 'weekly', '2026-09-29', '2036-09-17', 'Rumah murid', 1, NULL, '2026-09-29 00:35:24', '2026-09-29 00:35:24'),
(2, 3, 4, 5, '12:00:00', 60, 'weekly', '2026-09-28', '2036-09-17', 'Rumah murid', 1, NULL, '2026-09-29 14:01:23', '2026-09-29 14:10:18'),
(3, 1, 2, 1, '14:00:00', 90, 'weekly', '2026-10-12', '2030-09-08', 'Sawangan', 1, NULL, '2026-09-30 02:22:35', '2026-09-30 02:22:35'),
(6, 1, 3, 5, '14:00:00', 90, 'weekly', '2026-10-12', '2030-09-08', 'Sawangan', 1, NULL, '2026-09-30 02:24:44', '2026-09-30 02:24:44'),
(8, 2, 1, 4, '12:00:00', 60, 'weekly', '2026-09-24', '2036-09-10', 'Permata Depok', 1, NULL, '2026-09-30 02:25:53', '2026-09-30 02:29:36'),
(9, 1, 2, 2, '14:00:00', 90, 'weekly', '2026-10-12', '2030-09-08', 'Sawangan', 1, NULL, '2026-09-30 02:34:49', '2026-09-30 02:34:49'),
(10, 1, 2, 3, '15:30:00', 90, 'weekly', '2026-10-12', '2030-09-08', 'Sawangan', 1, NULL, '2026-09-30 02:35:24', '2026-09-30 02:35:24'),
(11, 2, 1, 2, '12:00:00', 60, 'weekly', '2026-09-24', '2039-09-14', 'Permata Depok', 1, NULL, '2026-09-30 02:39:06', '2026-09-30 02:39:06'),
(12, 4, 5, 2, '16:00:00', 60, 'weekly', '2026-10-01', '2033-09-13', 'Sawangan', 1, NULL, '2026-09-30 02:42:10', '2026-09-30 02:42:10'),
(13, 4, 5, 3, '17:00:00', 60, 'weekly', '2026-10-01', '2033-09-13', 'Sawangan', 1, NULL, '2026-09-30 02:42:23', '2026-09-30 02:42:23'),
(14, 5, 6, 2, '13:30:00', 60, 'weekly', '2026-10-16', '2036-10-31', 'Sawangan', 1, NULL, '2026-10-28 05:21:14', '2026-10-28 05:21:14'),
(15, 5, 6, 3, '14:30:00', 60, 'weekly', '2026-10-16', '2036-10-31', 'Sawangan', 1, NULL, '2026-10-28 05:21:40', '2026-10-28 05:21:40'),
(16, 5, 7, 5, '14:00:00', 60, 'weekly', '2026-10-16', '2036-10-31', 'Sawangan', 1, NULL, '2026-10-28 05:21:56', '2026-10-28 05:22:31');

-- --------------------------------------------------------

--
-- Struktur dari tabel `settings`
--

CREATE TABLE `settings` (
  `key` varchar(120) NOT NULL,
  `value` text NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `students`
--

CREATE TABLE `students` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `nickname` varchar(60) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `school` varchar(160) DEFAULT NULL,
  `grade` varchar(60) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `avatar_path` varchar(500) DEFAULT NULL,
  `color` varchar(20) NOT NULL DEFAULT 'violet',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `parent_name` varchar(120) DEFAULT NULL,
  `parent_phone` varchar(32) DEFAULT NULL,
  `parent_email` varchar(191) DEFAULT NULL,
  `tutor_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `report_format` enum('narrative','checklist') NOT NULL DEFAULT 'narrative',
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `students`
--

INSERT INTO `students` (`id`, `name`, `nickname`, `birth_date`, `school`, `grade`, `notes`, `avatar_path`, `color`, `is_active`, `parent_name`, `parent_phone`, `parent_email`, `tutor_id`, `created_at`, `updated_at`, `report_format`, `period_start`, `period_end`) VALUES
(1, 'Alliando Fatih Hamizan', 'Alliando', NULL, 'SD', '3', NULL, NULL, 'sky', 1, 'Mami Adilla', '+62 822-4393-9217', NULL, 1, '2026-09-29 00:15:30', '2026-09-29 00:15:30', 'narrative', '2026-10-12', '2030-09-08'),
(2, 'Ayshalynn', 'Aysha', NULL, 'KB', NULL, NULL, NULL, 'pink', 0, 'Bunda Chika', '+62 877-7669-8007', NULL, 1, '2026-09-29 00:17:53', '2026-10-28 05:17:22', 'narrative', '2026-09-24', '2039-09-14'),
(3, 'Adelicia', 'Adel', NULL, 'SD', '4', NULL, NULL, 'pink', 1, 'Bunda Adel', '+62 878-2040-3591', NULL, 1, '2026-09-29 00:32:23', '2026-10-02 13:18:48', 'narrative', '2026-10-05', '2036-09-17'),
(4, 'Latisya Aluna', 'Latisya', NULL, 'KB', NULL, NULL, NULL, 'violet', 1, 'Bunda Nadya', '+62 813-3451-2014', NULL, 1, '2026-09-29 00:34:10', '2026-09-29 00:34:10', 'narrative', '2026-10-01', '2033-09-13'),
(5, 'Delisha', NULL, NULL, 'KB', NULL, NULL, NULL, 'pink', 1, 'Mami Adilla', '+62 822-4393-9217', NULL, 1, '2026-10-28 05:19:59', '2026-10-28 05:19:59', 'narrative', '2026-10-16', '2036-10-31');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `name` varchar(120) NOT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `role` enum('tutor','parent','super_admin') NOT NULL,
  `avatar_path` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ai_style_notes` text DEFAULT NULL,
  `active_until` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `name`, `phone`, `role`, `avatar_path`, `is_active`, `last_login_at`, `created_at`, `updated_at`, `ai_style_notes`, `active_until`) VALUES
(1, 'annisayunr@gmail.com', '$2b$12$32TpGNWUMYDdUCB4Wgd1IePU/.9Ko./Z2q2xsUITLhxvGUCrEAJ1G', 'Annisa Ayu Nurul Rizqy', '0895383392364', 'tutor', NULL, 1, '2026-09-30 02:38:46', '2026-09-29 00:09:22', '2026-09-30 02:38:46', NULL, NULL),
(2, 'admin@lenbee.id', '$2b$12$tFOqp43dwNj6sAEl/h3w8.PLiDUAj8fL0r4Jm0qM4JDYmrPjsYHAm', 'admin', NULL, 'super_admin', NULL, 1, '2026-09-30 02:08:59', '2026-09-30 01:39:35', '2026-09-30 02:08:59', NULL, NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `__drizzle_migrations`
--

CREATE TABLE `__drizzle_migrations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `hash` text NOT NULL,
  `created_at` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `__drizzle_migrations`
--

INSERT INTO `__drizzle_migrations` (`id`, `hash`, `created_at`) VALUES
(1, 'd8d4e5421e9e799a919b16e6579c0e4ae2b116869249eb04b219c4a2d9e71197', 1790412839363),
(2, 'c1e2eeed14bea93ab5a70086cfd17c0e473814557bdd880fd0d42936fda766a0', 1790423972297),
(3, 'a711be46962f6492ab87efc352161dd59cabde0a64a7d9a0173c102796e0e540', 1790439429498),
(4, 'd422f201f27d9ab1b0fce6052da6060e6d510ac765ea7a196e428967e2f27124', 1790440583856),
(5, 'f9ad80b4abd66013c20ac5ab64e68934c9598002cdace8f2dc7224f36206a0aa', 1790481419686),
(6, 'e8b53eeb46055af53fb9643872e741c40d698877a1991051f9c54dc621078c19', 1790485731678),
(7, '9d2817ccc11fbd45482726479e8c6a1cb7288cc6befb36f8836ad6ba35a85e72', 1790486554393),
(8, 'bbd4ab1b510d3dafa4230162db20aada4984e8a9f11d44a95d94f48ca6834263', 1790494387367),
(9, 'a150b7dc59f41c8c5c8b450b2c5a4c991919f3d4284de479353c9c539676ebd3', 1790496579736),
(10, 'd55046d4bfdbd969ee602a4fc8e23dbbfd454ebf2b9db3510d34332b8840f96e', 1790561676409),
(11, '9866a55485e490fc762bddde0ea78fd3ca88c5ba05a6a243a82e6fe8c72f5f3a', 1790644141424);

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `ai_api_keys`
--
ALTER TABLE `ai_api_keys`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ai_api_keys_route_idx` (`provider`,`is_active`,`priority`);

--
-- Indeks untuk tabel `ai_chat_messages`
--
ALTER TABLE `ai_chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ai_chat_messages_session_idx` (`session_id`,`created_at`);

--
-- Indeks untuk tabel `ai_chat_sessions`
--
ALTER TABLE `ai_chat_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ai_chat_sessions_student_id_students_id_fk` (`student_id`),
  ADD KEY `ai_chat_sessions_tutor_idx` (`tutor_id`,`updated_at`);

--
-- Indeks untuk tabel `ai_generations`
--
ALTER TABLE `ai_generations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ai_generations_user_idx` (`user_id`,`created_at`);

--
-- Indeks untuk tabel `ai_models`
--
ALTER TABLE `ai_models`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ai_models_provider_model_uq` (`provider`,`model_id`);

--
-- Indeks untuk tabel `assignments`
--
ALTER TABLE `assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `assignments_token_uq` (`public_token`),
  ADD KEY `assignments_program_id_programs_id_fk` (`program_id`),
  ADD KEY `assignments_created_by_user_id_users_id_fk` (`created_by_user_id`),
  ADD KEY `assignments_student_idx` (`student_id`),
  ADD KEY `assignments_status_idx` (`status`);

--
-- Indeks untuk tabel `assignment_attempts`
--
ALTER TABLE `assignment_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `attempts_assignment_idx` (`assignment_id`),
  ADD KEY `attempts_student_idx` (`student_id`);

--
-- Indeks untuk tabel `attempt_answers`
--
ALTER TABLE `attempt_answers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `attempt_answers_uq` (`attempt_id`,`question_id`),
  ADD KEY `attempt_answers_question_idx` (`question_id`);

--
-- Indeks untuk tabel `auth_sessions`
--
ALTER TABLE `auth_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `auth_sessions_user_idx` (`user_id`),
  ADD KEY `auth_sessions_exp_idx` (`expires_at`);

--
-- Indeks untuk tabel `bank_questions`
--
ALTER TABLE `bank_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bank_questions_tutor_subject_idx` (`tutor_id`,`subject`),
  ADD KEY `bank_questions_tutor_material_idx` (`tutor_id`,`material`),
  ADD KEY `bank_questions_tutor_grade_idx` (`tutor_id`,`grade`);

--
-- Indeks untuk tabel `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `documents_lesson_id_lesson_sessions_id_fk` (`lesson_id`),
  ADD KEY `documents_uploaded_by_user_id_users_id_fk` (`uploaded_by_user_id`),
  ADD KEY `documents_student_idx` (`student_id`),
  ADD KEY `documents_program_idx` (`program_id`),
  ADD KEY `documents_category_idx` (`category`);

--
-- Indeks untuk tabel `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoices_number_uq` (`invoice_number`),
  ADD UNIQUE KEY `invoices_token_uq` (`public_token`),
  ADD KEY `invoices_created_by_user_id_users_id_fk` (`created_by_user_id`),
  ADD KEY `invoices_student_idx` (`student_id`),
  ADD KEY `invoices_status_idx` (`status`);

--
-- Indeks untuk tabel `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `invoice_items_program_id_programs_id_fk` (`program_id`),
  ADD KEY `invoice_items_invoice_idx` (`invoice_id`),
  ADD KEY `invoice_items_lesson_idx` (`lesson_id`);

--
-- Indeks untuk tabel `lesson_attachments`
--
ALTER TABLE `lesson_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lesson_attachments_lesson_idx` (`lesson_id`);

--
-- Indeks untuk tabel `lesson_sessions`
--
ALTER TABLE `lesson_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ls_schedule_slot_uq` (`schedule_id`,`date`,`start_time`),
  ADD KEY `lesson_sessions_moved_from_id_lesson_sessions_id_fk` (`moved_from_id`),
  ADD KEY `lesson_sessions_moved_to_id_lesson_sessions_id_fk` (`moved_to_id`),
  ADD KEY `ls_student_date_idx` (`student_id`,`date`),
  ADD KEY `ls_tutor_date_idx` (`tutor_id`,`date`),
  ADD KEY `ls_status_idx` (`status`),
  ADD KEY `ls_invoice_idx` (`invoice_id`),
  ADD KEY `ls_program_idx` (`program_id`);

--
-- Indeks untuk tabel `login_attempts`
--
ALTER TABLE `login_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `login_attempts_ident_idx` (`identifier`,`created_at`);

--
-- Indeks untuk tabel `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `notifications_dedupe_uq` (`user_id`,`dedupe_key`),
  ADD KEY `notifications_user_idx` (`user_id`,`is_read`);

--
-- Indeks untuk tabel `parent_invites`
--
ALTER TABLE `parent_invites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `parent_invites_token_uq` (`token`),
  ADD KEY `parent_invites_created_by_user_id_users_id_fk` (`created_by_user_id`);

--
-- Indeks untuk tabel `parent_students`
--
ALTER TABLE `parent_students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `parent_students_uq` (`parent_user_id`,`student_id`),
  ADD KEY `parent_students_student_id_students_id_fk` (`student_id`);

--
-- Indeks untuk tabel `parent_updates`
--
ALTER TABLE `parent_updates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_updates_created_by_user_id_users_id_fk` (`created_by_user_id`),
  ADD KEY `parent_updates_student_idx` (`student_id`),
  ADD KEY `parent_updates_status_idx` (`status`);

--
-- Indeks untuk tabel `programs`
--
ALTER TABLE `programs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `programs_student_idx` (`student_id`);

--
-- Indeks untuk tabel `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `push_subscriptions_endpoint_uq` (`endpoint`),
  ADD KEY `push_subscriptions_user_idx` (`user_id`);

--
-- Indeks untuk tabel `questions`
--
ALTER TABLE `questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `questions_assignment_idx` (`assignment_id`);

--
-- Indeks untuk tabel `report_check_items`
--
ALTER TABLE `report_check_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `report_check_items_update_idx` (`update_id`);

--
-- Indeks untuk tabel `schedules`
--
ALTER TABLE `schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `schedules_student_idx` (`student_id`),
  ADD KEY `schedules_program_idx` (`program_id`),
  ADD KEY `schedules_dow_idx` (`day_of_week`);

--
-- Indeks untuk tabel `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`key`);

--
-- Indeks untuk tabel `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD KEY `students_tutor_idx` (`tutor_id`),
  ADD KEY `students_name_idx` (`name`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_uq` (`email`),
  ADD KEY `users_role_idx` (`role`);

--
-- Indeks untuk tabel `__drizzle_migrations`
--
ALTER TABLE `__drizzle_migrations`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `ai_api_keys`
--
ALTER TABLE `ai_api_keys`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `ai_chat_messages`
--
ALTER TABLE `ai_chat_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `ai_chat_sessions`
--
ALTER TABLE `ai_chat_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `ai_generations`
--
ALTER TABLE `ai_generations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `ai_models`
--
ALTER TABLE `ai_models`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `assignments`
--
ALTER TABLE `assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `assignment_attempts`
--
ALTER TABLE `assignment_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `attempt_answers`
--
ALTER TABLE `attempt_answers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `bank_questions`
--
ALTER TABLE `bank_questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `lesson_attachments`
--
ALTER TABLE `lesson_attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `lesson_sessions`
--
ALTER TABLE `lesson_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19080;

--
-- AUTO_INCREMENT untuk tabel `login_attempts`
--
ALTER TABLE `login_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT untuk tabel `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT untuk tabel `parent_invites`
--
ALTER TABLE `parent_invites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `parent_students`
--
ALTER TABLE `parent_students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `parent_updates`
--
ALTER TABLE `parent_updates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `programs`
--
ALTER TABLE `programs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `questions`
--
ALTER TABLE `questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `report_check_items`
--
ALTER TABLE `report_check_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `schedules`
--
ALTER TABLE `schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT untuk tabel `students`
--
ALTER TABLE `students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `__drizzle_migrations`
--
ALTER TABLE `__drizzle_migrations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `ai_chat_messages`
--
ALTER TABLE `ai_chat_messages`
  ADD CONSTRAINT `ai_chat_messages_session_id_ai_chat_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `ai_chat_sessions` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `ai_chat_sessions`
--
ALTER TABLE `ai_chat_sessions`
  ADD CONSTRAINT `ai_chat_sessions_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `ai_chat_sessions_tutor_id_users_id_fk` FOREIGN KEY (`tutor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `ai_generations`
--
ALTER TABLE `ai_generations`
  ADD CONSTRAINT `ai_generations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `assignments`
--
ALTER TABLE `assignments`
  ADD CONSTRAINT `assignments_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `assignments_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `assignments_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `assignment_attempts`
--
ALTER TABLE `assignment_attempts`
  ADD CONSTRAINT `assignment_attempts_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `assignment_attempts_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `attempt_answers`
--
ALTER TABLE `attempt_answers`
  ADD CONSTRAINT `attempt_answers_attempt_id_assignment_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `assignment_attempts` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `attempt_answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `auth_sessions`
--
ALTER TABLE `auth_sessions`
  ADD CONSTRAINT `auth_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `bank_questions`
--
ALTER TABLE `bank_questions`
  ADD CONSTRAINT `bank_questions_tutor_id_users_id_fk` FOREIGN KEY (`tutor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_lesson_id_lesson_sessions_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lesson_sessions` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `documents_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `documents_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `documents_uploaded_by_user_id_users_id_fk` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `invoices_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `invoice_items_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `invoice_items_lesson_id_lesson_sessions_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lesson_sessions` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `invoice_items_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `lesson_attachments`
--
ALTER TABLE `lesson_attachments`
  ADD CONSTRAINT `lesson_attachments_lesson_id_lesson_sessions_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lesson_sessions` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `lesson_sessions`
--
ALTER TABLE `lesson_sessions`
  ADD CONSTRAINT `lesson_sessions_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `lesson_sessions_moved_from_id_lesson_sessions_id_fk` FOREIGN KEY (`moved_from_id`) REFERENCES `lesson_sessions` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `lesson_sessions_moved_to_id_lesson_sessions_id_fk` FOREIGN KEY (`moved_to_id`) REFERENCES `lesson_sessions` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `lesson_sessions_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON UPDATE NO ACTION,
  ADD CONSTRAINT `lesson_sessions_schedule_id_schedules_id_fk` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `lesson_sessions_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `lesson_sessions_tutor_id_users_id_fk` FOREIGN KEY (`tutor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `parent_invites`
--
ALTER TABLE `parent_invites`
  ADD CONSTRAINT `parent_invites_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `parent_students`
--
ALTER TABLE `parent_students`
  ADD CONSTRAINT `parent_students_parent_user_id_users_id_fk` FOREIGN KEY (`parent_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `parent_students_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `parent_updates`
--
ALTER TABLE `parent_updates`
  ADD CONSTRAINT `parent_updates_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `parent_updates_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `programs`
--
ALTER TABLE `programs`
  ADD CONSTRAINT `programs_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  ADD CONSTRAINT `push_subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `questions_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `report_check_items`
--
ALTER TABLE `report_check_items`
  ADD CONSTRAINT `report_check_items_update_id_parent_updates_id_fk` FOREIGN KEY (`update_id`) REFERENCES `parent_updates` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `schedules`
--
ALTER TABLE `schedules`
  ADD CONSTRAINT `schedules_program_id_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `schedules_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Ketidakleluasaan untuk tabel `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_tutor_id_users_id_fk` FOREIGN KEY (`tutor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
