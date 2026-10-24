"""Unit checks for private chat room identity and membership."""
import unittest

from app.services.chat_rooms import can_access_direct_room, direct_room_id


class ChatDirectRoomTests(unittest.TestCase):
    def test_direct_room_is_stable_and_does_not_expose_user_ids(self):
        room = direct_room_id("student-1", "professor-2")

        self.assertEqual(room, direct_room_id("professor-2", "student-1"))
        self.assertTrue(room.startswith("dm-"))
        self.assertNotIn("student-1", room)
        self.assertNotIn("professor-2", room)

    def test_only_conversation_participants_can_access_private_room(self):
        conversation = {"participants": ["student-1", "professor-2"]}

        self.assertTrue(can_access_direct_room(conversation, "student-1"))
        self.assertTrue(can_access_direct_room(conversation, "professor-2"))
        self.assertFalse(can_access_direct_room(conversation, "another-student"))
        self.assertFalse(can_access_direct_room(None, "student-1"))


if __name__ == "__main__":
    unittest.main()
