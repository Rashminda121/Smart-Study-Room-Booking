import React, { useState, useEffect } from "react";
import firebase from "firebase/compat/app"; // Import firebase from 'firebase/compat/app'
import "firebase/compat/database";
import { useMsal } from "@azure/msal-react";

const Booking = () => {
  const { accounts } = useMsal();
  const [userBookings, setUserBookings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [disabledLeaveButtons, setDisabledLeaveButtons] = useState({});
  const [selectedBooking, setSelectedBooking] = useState(null);
  const currentDate = new Date().toISOString().slice(0, 10); // Get current date in YYYY-MM-DD format
  const [outTimeExceeded, setOutTimeExceeded] = useState({});

  useEffect(() => {
    const fetchUserBookings = async () => {
      try {
        const bookingsRef = firebase.database().ref("bookings");
        const snapshot = await bookingsRef
          .orderByChild("email")
          .equalTo(accounts[0].username)
          .once("value");
        const bookings = snapshot.val();
        if (bookings) {
          const userBookingsArray = Object.keys(bookings).map((key) => ({
            id: key,
            ...bookings[key],
          }));

          // Determine if out time has been exceeded for each booking
          const currentTime = new Date();
          const exceededBookings = userBookingsArray.reduce(
            (exceeded, booking) => {
              const outTime = new Date(`${booking.date}T${booking.outtime}`);
              exceeded[booking.id] = currentTime > outTime;
              return exceeded;
            },
            {}
          );

          setUserBookings(userBookingsArray.reverse()); // Reverse the order of userBookingsArray
          setOutTimeExceeded(exceededBookings); // Update outTimeExceeded state
        }
      } catch (error) {
        console.error("Error fetching user bookings:", error);
      }
    };

    fetchUserBookings();
  }, [accounts]);

  // Function to handle opening the modal and setting the selected booking
  const openModal = (booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  // Function to handle closing the modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Function to update booking data in Firebase and local state
  const updateLeaveInFirebase = async (bookingId, newBookingData) => {
    try {
      const bookingsRef = firebase.database().ref("bookings").child(bookingId);
      await bookingsRef.update(newBookingData); // Update booking data in Firebase

      // Update local state of userBookings with the updated data
      setUserBookings((prevUserBookings) => {
        return prevUserBookings.map((booking) => {
          if (booking.id === bookingId) {
            return { ...booking, ...newBookingData };
          } else {
            return booking;
          }
        });
      });

      console.log("Booking updated successfully!");
      setDisabledLeaveButtons((prevState) => ({
        ...prevState,
        [bookingId]: true,
      })); // Disable the Leave button for the corresponding booking
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };
  // Function to update booking data in Firebase and local state
  const updateBookingInFirebase = async (newBookingData) => {
    try {
      if (!selectedBooking) {
        console.error("No booking selected.");
        return;
      }

      const bookingsRef = firebase
        .database()
        .ref("bookings")
        .child(selectedBooking.id);
      await bookingsRef.update(newBookingData); // Update booking data in Firebase

      // Update local state of userBookings with the updated data
      setUserBookings((prevUserBookings) => {
        const updatedUserBookings = prevUserBookings.map((booking) => {
          if (booking.id === selectedBooking.id) {
            return { ...booking, ...newBookingData };
          } else {
            return booking;
          }
        });
        return updatedUserBookings;
      });

      console.log("Booking updated successfully!");
      closeModal(); // Close the modal after updating the booking
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  };

  // Function to handle editing a booking
  const handleEditBooking = () => {
    const inTimeInput = document.getElementById("inTimeInput").value;
    const outTimeInput = document.getElementById("outTimeInput").value;
    const newBookingData = {
      intime: inTimeInput,
      outtime: outTimeInput,
    };
    updateBookingInFirebase(newBookingData); // Call the function to update booking data in Firebase
  };

  // Function to handle leaving a booking
  const handleLeave = (booking) => {
    const currentTime = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }); // Get current time in hh:mm format
    const newBookingData = {
      outtime: currentTime,
      leaveButtonDisabled: true, // Add leaveButtonDisabled flag to the booking data
    };
    updateLeaveInFirebase(booking.id, newBookingData); // Call the function to update booking data in Firebase
  };

  return (
    <div className="py-8 lg:m-16">
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 rtl:text-right dark:text-gray-400">
          {/* Table header */}
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">
                Student ID
              </th>
              <th scope="col" className="px-6 py-3">
                Date
              </th>
              <th scope="col" className="px-6 py-3">
                In Time
              </th>
              <th scope="col" className="px-6 py-3">
                Out Time
              </th>
              <th scope="col" className="px-6 py-3">
                Actions
              </th>
              <th scope="col" className="px-6 py-3">
                Actions
              </th>
              <th scope="col" className="px-6 py-3">
                Actions
              </th>
            </tr>
          </thead>
          {/* Table body */}
          <tbody>
            {userBookings.map((booking) => (
              <tr
                key={booking.id}
                className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
              >
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  {booking.studentId}
                </td>
                <td className="px-6 py-4">{booking.date}</td>
                <td className="px-6 py-4">{booking.intime}</td>
                <td className="px-6 py-4">{booking.outtime}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => openModal(booking)}
                    className={`font-medium text-blue-600 dark:text-blue-500 hover:underline mr-4 ${
                      booking.date !== currentDate ||
                      booking.leaveButtonDisabled ||
                      outTimeExceeded[booking.id]
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    disabled={
                      booking.date !== currentDate ||
                      booking.leaveButtonDisabled ||
                      outTimeExceeded[booking.id]
                    }
                  >
                    Edit
                  </button>
                </td>
                <td className="px-6 py-4">
                  <button
                    className={`font-medium text-blue-600 dark:text-blue-500 hover:underline mr-4 ${
                      booking.date !== currentDate ||
                      booking.leaveButtonDisabled ||
                      outTimeExceeded[booking.id]
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    disabled={
                      booking.date !== currentDate ||
                      booking.leaveButtonDisabled ||
                      outTimeExceeded[booking.id]
                    }
                  >
                    Cancel
                  </button>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleLeave(booking)}
                    className={`font-medium text-blue-600 dark:text-blue-500 hover:underline mr-4 ${
                      booking.date !== currentDate ||
                      booking.leaveButtonDisabled ||
                      outTimeExceeded[booking.id]
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    disabled={
                      booking.date !== currentDate ||
                      booking.leaveButtonDisabled ||
                      outTimeExceeded[booking.id]
                    }
                  >
                    Leave
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for editing booking */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-8 bg-white rounded-lg shadow-md">
            <h2 className="mb-4 text-lg font-semibold">Edit Booking</h2>
            <div className="mb-4">
              <label className="block mb-2">In Time:</label>
              <input
                id="inTimeInput"
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                defaultValue={selectedBooking.intime}
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2">Out Time:</label>
              <input
                id="outTimeInput"
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                defaultValue={selectedBooking.outtime}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleEditBooking}
                className="px-4 py-2 mr-2 text-white bg-blue-600 rounded-lg"
              >
                Save
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 text-white bg-gray-400 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
