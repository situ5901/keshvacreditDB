const User = require("../filterDB/model");
exports.filter = async (req, res) => {
  try {
    const totalDocs = await User.countDocuments();

    const duplicates = await User.aggregate([
      {
        $group: {
          _id: "$phone",
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
      {
        $group: {
          _id: null,
          duplicatePhoneCount: { $sum: { $subtract: ["$count", 1] } },
        },
      },
    ]);

    const duplicatePhoneCount = duplicates[0]?.duplicatePhoneCount || 0;

    res.status(200).json({
      totalDocuments: totalDocs,
      duplicatePhoneCount, // actual duplicates only
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.deleteDuplicatePhones = async (req, res) => {
  try {
    const duplicates = await User.aggregate([
      {
        $group: {
          _id: "$phone",
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    const idsToDelete = [];
    duplicates.forEach((doc) => {
      doc.ids.shift(); // removes the first ID
      idsToDelete.push(...doc.ids);
    });

    const deleteResult = await User.deleteMany({ _id: { $in: idsToDelete } });

    return res.status(200).json({
      message: "✅ Duplicate phone numbers deleted",
      totalDeleted: deleteResult.deletedCount,
    });
  } catch (err) {
    console.error("Error deleting duplicates:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
