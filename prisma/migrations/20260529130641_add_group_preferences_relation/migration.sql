-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
