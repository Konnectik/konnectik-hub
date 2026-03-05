import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, ChevronRight } from "lucide-react";
import PageTabs from "@/components/PageTabs";

const tabs = ["K-Users", "K-Owners", "K-Admins"];

const mockUsers = [
    {id: 1, name: "John Doe", walletBalance: 1000, UID: "1234567890", email: "john.doe@example.com", phoneNumber: "+237 123 456 789", date: "21/12/2022", time: "10:40 PM", status: "Online"},
    {id: 2, name: "Jane Smith", walletBalance: 1500, UID: "0987654321", email: "jane.smith@example.com", phoneNumber: "+237 123 456 789", date: "21/12/2022", time: "10:40 PM", status: "Offline"},
    {id: 3, name: "Bob Johnson", walletBalance: 0, UID: "1122334455", email: "bob.johnson@example.com", phoneNumber: "+237 123 456 789", date: "21/12/2022", time: "10:40 PM", status: "Online"},
];

const mockOwners = [
    {id: 1, name: "Alice Owner", walletBalance: 2000, UID: "1111111111", email: "alice.owner@example.com", phoneNumber: "+237 123 456 780", date: "15/01/2023", time: "2:30 PM", status: "Online"},
];

const mockAdmins = [
    {id: 1, name: "Charlie Admin", walletBalance: 3000, UID: "2222222222", email: "charlie.admin@example.com", phoneNumber: "+237 123 456 781", date: "10/02/2023", time: "4:45 PM", status: "Online"},
    {id: 2, name: "Diana Admin", walletBalance: 2500, UID: "3333333333", email: "diana.admin@example.com", phoneNumber: "+237 123 456 782", date: "05/03/2023", time: "1:15 PM", status: "Offline"},
];

const KUsers = () => {
    const [activeTab, setActiveTab] = useState("K-Users");
    const navigate = useNavigate();

    return (
        <div>
            <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Content */}
            <div className="p-6">
                <div className="bg-card rounded-xl border p-6 animate-fade-in shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold">
                                {activeTab === "K-Users" ? "List of users" : activeTab === "K-Owners" ? "List of owners" : "List of admins"}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {(activeTab === "K-Users" ? mockUsers : activeTab === "K-Owners" ? mockOwners : mockAdmins).length} {activeTab === "K-Users" ? "users" : activeTab === "K-Owners" ? "owners" : "admins"}
                            </p>
                        </div>
                    {activeTab !== "K-Users" && (
                        <Button onClick={() => navigate("/dashboard/users/add", { state: { role: activeTab === "K-Owners" ? "owner" : "admin" } })}>
                            <User size={16} className="mr-2" />
                            Add new {activeTab === "K-Owners" ? "owner" : activeTab === "K-Admins" ? "admin" : "user"}
                        </Button>
                    )}
                    </div>
                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">UID</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phone Number</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date Added</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(activeTab === "K-Users" ? mockUsers : activeTab === "K-Owners" ? mockOwners : mockAdmins).map((user) => (
                                    <tr key={user.UID} className="border-b">
                                        <td className="py-3 px-4">
                                            <div className="text-sm font-semibold">{user.name}</div>
                                            {activeTab !== "K-Admins" && (
                                                <div className="text-xs text-muted-foreground">{user.walletBalance} FCFA</div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-sm">{user.UID}</td>
                                        <td className="py-3 px-4 text-sm">{user.email}</td>
                                        <td className="py-3 px-4 text-sm">{user.phoneNumber}</td>
                                        <td className="py-3 px-4">
                                            <div className="text-sm font-semibold">{user.date}</div>
                                            <div className="text-xs text-muted-foreground">{user.time}</div>
                                        </td>
                                        <td className="py-3 px-4 text-sm">
                                            <span className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-medium ${
                                                user.status === "Online" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                            }`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <ChevronRight size={18} className="text-muted-foreground" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KUsers;
